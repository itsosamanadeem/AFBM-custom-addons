# -*- coding: utf-8 -*-

import json
from odoo.http import request
from odoo.addons.auth_oauth.controllers.main import OAuthLogin
import werkzeug
import logging

_logger = logging.getLogger(__name__)

class OAuthLoginInherit(OAuthLogin):

    def get_state(self, provider):
        redirect = request.params.get('redirect') or 'web'
        if not redirect.startswith(('//', 'http://', 'https://')):
            get_param = request.env['ir.config_parameter'].sudo().get_param
            base_url = get_param('web.base.url')
            redirect = '%s%s' % ('%s/' % base_url, redirect[1:] if redirect[0] == '/' else redirect) 
            #redirect = '%s%s' % (request.httprequest.url_root, redirect[1:] if redirect[0] == '/' else redirect)
        
        state = dict(
            d=request.session.db,
            p=provider['id'],
            r=werkzeug.urls.url_quote_plus(redirect),
        )

        _logger.info("redirect -1- "+redirect)
        token = request.params.get('token')
        if token:
            state['t'] = token
        return state

