# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request, Response
import json

import base64
from datetime import datetime

import logging

_LOGGER = logging.getLogger(__name__)


class GmailWebhookController(http.Controller):

    @http.route('/get_mail', type='http', csrf=False, auth='none', methods=["POST"])
    def handle_gmail_webhook(self, **kwargs):
        """Trigger when the mail is Sent or Received in the internal user gmail account"""
        webhook = request.env['ir.config_parameter'].sudo().get_param('ks_odoo_gmail_connector.receiving_server')
        server = request.env['ir.config_parameter'].sudo().get_param('ks_odoo_gmail_connector.activate_gmail_service')
        if webhook == 'webhook' and server == 'gmail_server':
            payload = json.loads(request.httprequest.data)
            # Handle multiple payloads
            if payload.get('message'):
                payload = json.loads(base64.b64decode(payload['message']['data']).decode('utf-8'))
            epoch_time = int(datetime.now().timestamp()) - 5
            request.env['mail.mail'].with_delay().process_queue_job(payload, epoch_time)
