# -*- coding: utf-8 -*-

import logging

import odoo
import odoo.modules.registry
from odoo import http
from odoo.tools.translate import _
from odoo.addons.web.controllers.utils import ensure_db, _get_login_redirect_url, is_user_internal
from odoo.addons.web.controllers.home import Home
from odoo.http import request
import json
from werkzeug.urls import url_encode

_logger = logging.getLogger(__name__)

SIGN_UP_REQUEST_PARAMS = {'db', 'login', 'debug', 'token', 'message', 'error', 'scope', 'mode',
                          'redirect', 'redirect_hostname', 'email', 'name', 'partner_id',
                          'password', 'confirm_password', 'city', 'country_id', 'lang', 'signup_email'}
LOGIN_SUCCESSFUL_PARAMS = set()


class KsHome(Home):

    def list_providers(self):
        """Override for getting access token and Refresh token while login with google"""
        client_id = request.env['ir.config_parameter'].sudo().get_param('google_gmail_client_id')
        client_secret = request.env['ir.config_parameter'].sudo().get_param('google_gmail_client_secret')
        if client_id and client_secret:
            try:
                providers = request.env['auth.oauth.provider'].sudo().search_read([('enabled', '=', True)])
            except Exception:
                providers = []
            for provider in providers:
                base_url = request.env['ir.config_parameter'].sudo().get_param('web.base.url')
                return_url = base_url + '/auth_oauth/signin'
                state = self.get_state(provider)
                if request.env.ref('auth_oauth.provider_google').id == provider.get('id'):
                    params = dict(
                        response_type='code',
                        approval_prompt='force',
                        access_type='offline',
                        client_id=provider['client_id'],
                        redirect_uri=return_url,
                        scope=provider['scope'],
                        state=json.dumps(state),
                    )
                else:
                    params = dict(
                        response_type='token',
                        client_id=provider['client_id'],
                        redirect_uri=return_url,
                        scope=provider['scope'],
                        state=json.dumps(state),
                    )
                provider['auth_link'] = "%s?%s" % (provider['auth_endpoint'], url_encode(params))
            return providers
        else:
            return super().list_providers()
