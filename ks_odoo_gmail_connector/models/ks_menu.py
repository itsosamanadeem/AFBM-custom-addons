# -*- coding: utf-8 -*-

from odoo import api, fields, models
from odoo.http import request


class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'

    @api.model
    def search(self, args, offset=0, limit=None, order=None, count=False):
        """Hide menu which is selected inside User management only for the selected users"""

        menu_ids = super(IrUiMenu, self).search(args, offset=0, limit=None, order=order)

        config_setting = self.env['ir.config_parameter'].sudo().get_param(
            'ks_odoo_gmail_connector.activate_gmail_service')
        ks_hide_menu_ids = None
        if config_setting == 'smtp_server':
            ks_hide_menu_ids = self.env.ref('ks_odoo_gmail_connector.root_menu')
        elif config_setting == 'gmail_server':
            ks_hide_menu_ids = self.env.ref('mail.menu_mail_mail')
            ks_hide_menu_ids += self.env.ref('mail.menu_mail_message')
            ks_hide_menu_ids += self.env.ref('base.menu_mail_servers')
            ks_hide_menu_ids += self.env.ref('mail.menu_action_fetchmail_server_tree')
        if ks_hide_menu_ids:
            menu_ids = menu_ids - ks_hide_menu_ids
        return menu_ids
