# -*- coding: utf-8 -*-

from odoo.exceptions import AccessDenied, UserError
from odoo import models, api, fields, _, SUPERUSER_ID, registry

import requests
import json
import logging
from datetime import datetime, timedelta
from odoo.exceptions import UserError, ValidationError
from odoo.addons.auth_signup.models.res_users import SignupError

_logger = logging.getLogger(__name__)


class ResUserInherit(models.Model):
    _inherit = "res.users"

    oauth_refresh_token = fields.Char(string='Auth Refresh Token', readonly=True)
    history_id = fields.Integer(string='History ID')
    history_change = fields.Datetime(string='History Change')
    logout = fields.Boolean(string='Logout', default=False)

    @api.model
    def auth_oauth(self, provider, params):

        client_id = self.env['ir.config_parameter'].sudo().get_param('google_gmail_client_id')
        client_secret = self.env['ir.config_parameter'].sudo().get_param('google_gmail_client_secret')
        if client_id and client_secret:
            cred = self.set_google_tokens(params.get('code'), client_id, client_secret)
            if cred:
                params['access_token'] = cred[0]
            res = super(ResUserInherit, self).auth_oauth(provider, params)
            if res:
                user = self.env['res.users'].search([('login', '=', res[1])])
                user.oauth_refresh_token = cred[1]
        else:
            res = super(ResUserInherit, self).auth_oauth(provider, params)
        return res

    @api.model
    def set_google_tokens(self, authorize_code, client_id, client_secret):
        """ Call Google API to exchange authorization code against token, with POST request, to
            not be redirected.
        """

        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        data = {
            'code': authorize_code,
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'authorization_code',
            'redirect_uri': base_url + "/auth_oauth/signin"
        }
        try:
            response = requests.request("POST", 'https://oauth2.googleapis.com/token', data=data,
                                        )
            response = json.loads(response.content.decode('utf-8'))
            access_token = response.get('access_token')
            refresh_token = response.get('refresh_token')
            ttl = response.get('expires_in')
            return access_token, refresh_token, ttl
        except requests.HTTPError:
            error_msg = _("Something went wrong during your token generation. Maybe your Authorization Code is invalid")
            raise self.env['res.config.settings'].get_config_warning(error_msg)

    def write(self, vals):
        try:
            res = super(ResUserInherit, self).write(vals)
            for rec in self:
                if rec.has_group('base.group_user'):
                    if vals.get('oauth_refresh_token') or vals.get('oauth_access_token') or vals.get(
                            'history_id') or vals.get('history_change'):
                        return res
                    six_days_before = datetime.now() - timedelta(days=6)
                    if rec.has_group('base.group_user') and not rec.history_id or (rec.history_change and
                                                                                   rec.history_change.day == six_days_before.day and rec.history_change.month == six_days_before.month):
                        client_id = rec.env['ir.config_parameter'].sudo().get_param('google_gmail_client_id')
                        client_secret = rec.env['ir.config_parameter'].sudo().get_param('google_gmail_client_secret')
                        topic_id = rec.env['ir.config_parameter'].sudo().get_param('ks_odoo_gmail_connector.topic')
                        if client_id and client_secret and rec.oauth_refresh_token and rec.oauth_access_token and topic_id:
                            service = rec.env['mail.mail'].sudo().create_service(rec)
                            request = {
                                'labelIds': ['SENT', 'INBOX', 'TRASH'],
                                'labelFilterAction': 'INCLUDE',
                                'topicName': topic_id,
                            }
                            history_id = service.users().watch(userId='me', body=request).execute()
                            rec.sudo().write({'history_id': history_id['historyId'], 'history_change': datetime.now()})
        except Exception as e:
            raise ValidationError(_(e))
        return res

    def _auth_oauth_signin(self, provider, validation, params):
        """ retrieve and sign in the user corresponding to provider and validated access token
            :param provider: oauth provider id (int)
            :param validation: result of validation of access token (dict)
            :param params: oauth parameters (dict)
            :return: user login (str)
            :raise: AccessDenied if signin failed

            This method can be overridden to add alternative signin methods.
        """
        oauth_uid = validation['user_id']
        try:
            oauth_user = self.sudo().search([('email', 'ilike', validation.get('email'))], limit=1)
            if not oauth_user:
                _logger.info("oauth_user not found for email -1- "+validation.get('email'))
                raise AccessDenied()
            assert len(oauth_user) == 1
            oauth_user.sudo().write(
                {'oauth_access_token': params['access_token'], 'oauth_uid': oauth_uid, 'oauth_provider_id': provider})
            return oauth_user.login
        except AccessDenied as access_denied_exception:
            if self.env.context.get('no_user_creation'):
                return None
            state = json.loads(params['state'])
            token = state.get('t')
            values = self._generate_signup_values(provider, validation, params)
            try:
                login, _ = self.signup(values, token)
                return login
            except (SignupError, UserError):
                raise access_denied_exception
