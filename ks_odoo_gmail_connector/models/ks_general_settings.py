# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime
from dateutil.relativedelta import relativedelta
from bs4 import BeautifulSoup
import logging

_logger = logging.getLogger(__name__)


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    def _default_outgoing_user(self):
        return self.env.user.id

    activate_gmail_service = fields.Selection([('smtp_server', 'SMTP Server'), ('gmail_server', 'Gmail Server')],
                                              string='Activate Gmail Service', default='smtp_server',
                                              config_parameter='ks_odoo_gmail_connector.activate_gmail_service')
    receiving_server = fields.Selection([('webhook', 'Webhook'), ('cron', 'Scheduled Action')],
                                        default='cron', string='Activate Webhook',
                                        config_parameter='ks_odoo_gmail_connector.receiving_server')
    topic = fields.Char(string='Topic', config_parameter='ks_odoo_gmail_connector.topic')
    mail_user_id = fields.Many2one('res.users', string='Topic', config_parameter='ks_odoo_gmail_connector.mail_user_id',
                                   default=_default_outgoing_user)

    # ks_custom_footer = fields.Char(string="Custom footer", render_engine='qweb',
    #                                render_options={'post_process': True},
    #                                prefetch=True, translate=True, sanitize=False,
    #                                config_parameter='ks_odoo_gmail_connector.ks_custom_footer')

    @api.model_create_multi
    def create(self, vals):
        last_setting = self.search([], order='id desc', limit=1)
        res = super(ResConfigSettings, self).create(vals)
        if not last_setting:
            last_setting = res
        client_id = res.google_gmail_client_identifier
        client_secret = res.google_gmail_client_secret
        google_provider = self.env.ref('auth_oauth.provider_google', False)
        if last_setting.google_gmail_client_identifier != client_id or last_setting.google_gmail_client_secret != client_secret or last_setting.activate_gmail_service != res.activate_gmail_service or last_setting.receiving_server != res.receiving_server:
            if res.activate_gmail_service == 'gmail_server':
                self.env.ref('mail.ir_cron_mail_gateway_action').active = False
                self.env.ref('mail.ir_cron_mail_scheduler_action').active = False
                # google_provider = self.env.ref('auth_oauth.provider_google', False)
                if client_id and client_secret and google_provider.enabled:
                    self.env.ref('ks_odoo_gmail_connector.logout_users').active = True
                    self.env.ref('ks_odoo_gmail_connector.logout_users').numbercall = 1
                    self.env.ref('ks_odoo_gmail_connector.logout_users').nextcall = datetime.now() + relativedelta(
                        minutes=5)
                    webhook = res.receiving_server
                    if webhook == 'webhook':
                        watch_cron = self.env.ref('ks_odoo_gmail_connector.ir_cron_create_watch')
                        watch_cron.active = True
                        watch_cron.nextcall = datetime.now() + relativedelta(minutes=5)
                        self.env.ref('ks_odoo_gmail_connector.ir_cron_receive_mail').active = False

                    elif webhook == 'cron':
                        self.env.ref('ks_odoo_gmail_connector.ir_cron_receive_mail').active = True
                        self.env.ref('ks_odoo_gmail_connector.ir_cron_create_watch').active = False
                else:
                    raise ValidationError(
                        _('Your Google login is not Activated, to Activate this.\n'
                          'Go to the Users & Companies --> OAuth Provider menu and Activate Google Login.'))
            elif res.activate_gmail_service == 'smtp_server':
                self.env.ref('ks_odoo_gmail_connector.ir_cron_receive_mail').active = False
                self.env.ref('ks_odoo_gmail_connector.ir_cron_create_watch').active = False
                self.env.ref('mail.ir_cron_mail_gateway_action').active = True
                self.env.ref('mail.ir_cron_mail_scheduler_action').active = True
        elif res.activate_gmail_service == 'gmail_server' and (not client_id or not client_secret):
            raise ValidationError(
                _('Please Fill client ID or Client Secret to access the Gmail Server.'))
        elif google_provider and not google_provider.enabled and res.activate_gmail_service == 'gmail_server':
            raise ValidationError(
                _('Your Google login is not Activated, to Activate this.\n'
                  'Go to the Users & Companies --> OAuth Provider menu and Activate Google Login.'))
        return res


class InheritedModel(models.AbstractModel):
    _inherit = 'mail.thread'

    def _notify_by_email_render_layout(self, message, recipients_group,
                                       msg_vals=False,
                                       render_values=None):
        """ Renders the email layout for a given recipients group which
        encapsulates the message body.
        """
        if render_values is None:
            render_values = {}
        email_layout_xmlid = msg_vals.get('email_layout_xmlid') if msg_vals else message.email_layout_xmlid

        template_xmlid = email_layout_xmlid if email_layout_xmlid else 'mail.mail_notification_layout'

        render_values = {**render_values, **recipients_group}

        try:
            custom_footer = self.env['res.partner'].sudo().search(
                [('id', '=', self.env.user.partner_id.id)]).ks_custom_footer
            if custom_footer:
                soup = BeautifulSoup(custom_footer, 'html.parser')
                plain_text = soup.get_text(strip=True)
                render_values['ks_custom_footer'] = plain_text
            mail_body = self.env['ir.qweb']._render(
                template_xmlid,
                render_values,
                minimal_qcontext=True,
                raise_if_not_found=False,
                lang=render_values.get('lang', self.env.lang),
            )

            if not mail_body:
                _logger.warning(
                    'QWeb template %s not found or is empty when sending notification emails. Sending without layouting.',
                    template_xmlid
                )
                mail_body = message.body
            return mail_body


        except Exception as e:
            _logger.error('Error rendering email layout: %s', str(e))
            mail_body = message.body

            return mail_body


class ResPartner(models.Model):
    _inherit = 'res.partner'

    ks_custom_footer = fields.Char(string="Custom footer")
