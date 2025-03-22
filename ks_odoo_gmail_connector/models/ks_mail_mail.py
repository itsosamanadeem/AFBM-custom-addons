# -*- coding: utf-8 -*-

from google.oauth2.credentials import Credentials

from email.message import EmailMessage
from datetime import datetime, timedelta
import mimetypes
from odoo import models, fields, api, tools, _
import base64
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from odoo.http import request
import werkzeug
import json
import logging
from odoo.exceptions import ValidationError
import ast
import re
from odoo.tools import config, ustr, pycompat

_LOGGER = logging.getLogger(__name__)


class MailMail(models.Model):
    _inherit = 'mail.mail'

    email_thread_id = fields.Char(string="Thread Id")
    email_message_id = fields.Char(string="Message Id")

    gmail_type = fields.Selection([('sent', 'Sent'), ('receive', 'Received')], string="Thread Id")
    sender_user = fields.Many2one('res.users', string='Sender User', compute='_compute_user', store=True)
    receiver_user = fields.Many2one('res.users', string='Receiver User', store=True, )
    cc_partner = fields.Many2many('res.partner', 'mail_mail_res_partner_ref_rel', 'mail_mail_partner_id',
                                  'partner_mail_id', string="Email Cc")
    parent_mail_id = fields.Many2one('mail.mail', string='Parent Mail')
    ks_show_in_thread = fields.Boolean(string='Show in Thread')

    @api.depends('email_from', 'email_to')
    def _compute_user(self):
        """Link Sender user and Receiver user with mail"""
        for rec in self:
            sender_user = self.env['res.users'].sudo().search(
                ['|', ('email', 'ilike', rec.email_from), ('partner_id', '=', rec.author_id.id)], limit=1)
            rec.sender_user = sender_user.id

    def create(self, vals):
        res = super(MailMail, self).create(vals)
        return res

    def ks_get_thread_id(self, service):

        query = f'subject:{self.subject.replace("Re: ", "")}'
        results = service.users().messages().list(userId='me', q=query).execute()
        thread_id, unique_threads, messages = False, {}, []
        # Create a new dictionary with unique threadId values
        for item in results.get('messages', []):
            each_thread_id = item['threadId']
            if each_thread_id not in unique_threads:
                unique_threads[each_thread_id] = item
                messages.append(item)

        if 'messages' in results and self.references:
            for message_data in messages:
                message = service.users().messages().get(userId='me', id=message_data['id']).execute()
                headers = message['payload']['headers']
                subject, reference = False, False
                for header in headers:
                    if header['name'] == 'Subject':
                        subject = header['value']
                    elif header['name'] in ['References', 'references']:
                        reference = header['value']
                if (subject == self.subject.replace('Re: ', '').strip() or subject == f'Re: {self.subject}') and \
                        reference.split(' ')[0] in self.references:
                    thread_id = message_data['threadId']
                    return thread_id
        return thread_id

    def send(self, auto_commit=False, raise_exception=False):
        """Sent the mail from logged in user's email."""
        server = self.env['ir.config_parameter'].sudo().get_param('ks_odoo_gmail_connector.activate_gmail_service')
        if server == 'gmail_server' and not self.env.context.get('install_mode'):
            try:
                service = self.create_service()
                for rec in self:
                    # Prepare message value
                    message_to = []
                    emails = ''
                    if self.env.context.get('is_reply') or self.env.context.get('is_composed'):
                        partners = rec.partner_ids
                    else:
                        partners = rec.recipient_ids
                    partners -= rec.mail_message_id.email_cc
                    # user_email = True if partners.mapped('user_ids') else False
                    for partner in partners:
                        # if (rec.env.context.get('is_composed') and rec.env.context.get('active_model') == 'mail.mail'
                        #         and partner.id not in rec.partner_ids.ids):
                        #     continue
                        # else:
                        message_to.append(partner.email)
                    for email_to in rec.email_to.split(',') if rec.email_to else []:
                        message_to.append(email_to)
                    for email in message_to:
                        if emails:
                            emails = emails + ',' + email
                        else:
                            emails += email
                    message = EmailMessage()
                    headers = {}
                    message['From'] = rec.email_from
                    message['to'] = message_to
                    message['Reply-To'] = rec.email_from
                    # if user_email:
                    rec_cc_user = rec.mail_message_id.email_cc
                    # else:
                    #     rec_cc_user = rec.mail_message_id.email_cc.filtered(lambda pid: not pid.user_ids)
                    email_cc = rec.email_cc or rec_cc_user.mapped('email')
                    message['Cc'] = email_cc
                    if rec.references:
                        message['references'] = rec.references
                        message['Message-Id'] = rec.message_id
                    message['Subject'] = rec.subject
                    for key, value in headers.items():
                        message[pycompat.to_text(ustr(key))] = value
                    try:
                        body_html = self.env['mail.render.mixin']._replace_local_links(rec.body_html)
                    except:
                        body_html = rec.body_html
                    msg_html = f"<html><body>{body_html}</body></html>"
                    message.set_content(msg_html, subtype='html')
                    for attach in rec.attachment_ids:
                        type_subtype, _ = mimetypes.guess_type(attach.name)
                        maintype, subtype = type_subtype.split('/')

                        message.add_attachment(base64.urlsafe_b64decode(attach.datas), maintype, subtype,
                                               filename=attach.name)
                    n_massage = base64.urlsafe_b64encode(message.as_bytes()).decode()
                    user = self._context.get('user')

                    if rec.headers:
                        try:
                            headers.update(ast.literal_eval(rec.headers))
                        except Exception:
                            pass

                    thread_exist = rec.ks_get_thread_id(service)

                    body = {'raw': n_massage,
                            'threadId': thread_exist,
                            } if thread_exist else {
                        'raw': n_massage}
                    try:
                        message = service.users().messages().send(userId='me', body=body).execute()
                    except:
                        message = service.users().messages().send(userId='me', body={'raw': n_massage}).execute()
                        rec.sudo().write({'email_thread_id': message.get('threadId')})

                    service.users().messages().get(userId='me', id=message.get('id')).execute()
                    is_composed = self._context.get('is_composed', False)
                    rec.mail_message_id.is_composed = is_composed
                    vals = {'email_thread_id': message.get('threadId'), 'email_message_id': message.get('id'),
                            'message_id': self.env.context.get('message_id'), 'sender_user': user.id if user else None,
                            'state': 'sent', 'gmail_type': 'sent', 'email_to': emails,
                            'email_cc': rec.email_cc or rec_cc_user.mapped('email'),
                            'recipient_ids': [(6, 0, partners.ids)],
                            'cc_partner': [(6, 0, rec_cc_user.ids)]}
                    if not rec.model and not rec.res_id:
                        vals.update(
                            {'model': 'res.partner', 'res_id': user.partner_id.id, 'parent_id': rec.mail_message_id.id})
                    rec.sudo().write(vals)
                    _LOGGER.info('Message Sent Successfully')

            except Exception as e:
                raise ValidationError(e)
        else:
            super(MailMail, self).send(auto_commit, raise_exception)

    def get_state(self, provider):
        redirect = request.params.get('redirect') or 'web'
        if not redirect.startswith(('//', 'http://', 'https://')):
            redirect = '%s%s' % (request.httprequest.url_root, redirect[1:] if redirect[0] == '/' else redirect)
        state = dict(
            d=request.session.db,
            p=provider['id'],
            r=werkzeug.urls.url_quote_plus(redirect),
        )
        token = request.params.get('token')
        if token:
            state['t'] = token
        return state

    def create_service(self, user=False):
        """Create Gmail service with client secret, client id, Access and refresh token(User specific) """
        user = user or self.env['res.users'].browse(self.env.context.get('uid')) or self.env.user
        if user.has_group('base.group_public') or user.login == '__system__':
            outgoing_user = self.env['ir.config_parameter'].sudo().get_param('ks_odoo_gmail_connector.mail_user_id', 0)
            if outgoing_user:
                user = self.env['res.users'].sudo().browse(int(outgoing_user))
                if not user.oauth_access_token:
                    raise ValidationError(_('Outgoing User is not AUTHORIZED.Please do login with google first!'))
            else:
                raise ValidationError(_('NO OUTGOING USER SELECTED>'))
        context = dict(self.env.context)
        context['user'] = user
        self.env.context = context
        client_id = self.env['ir.config_parameter'].sudo().get_param('google_gmail_client_id')
        client_secret = self.env['ir.config_parameter'].sudo().get_param('google_gmail_client_secret')
        creds = Credentials.from_authorized_user_info(
            {
                "token": user.oauth_access_token,
                "refresh_token": user.oauth_refresh_token,
                "grant_type": "authorization_code",
                "token_uri": "https://www.googleapis.com/oauth2/v1/tokeninfo",
                "client_id": client_id,
                "access_token": user.oauth_access_token,
                "client_secret": client_secret,
            })
        # If there are not valid credentials available, this will refresh the token.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception as e:
                    raise ValidationError(_(e))
            else:
                provider_google = self.env.ref('auth_oauth.provider_google')
                return_url = request.httprequest.url_root + 'auth_oauth/signin'
                state = self.get_state(provider_google)
                params = dict(
                    response_type='code',
                    approval_prompt='force',
                    access_type='offline',
                    client_id=provider_google['client_id'],
                    redirect_uri=return_url,
                    scope=provider_google['scope'],
                    state=json.dumps(state),
                )
                link = "%s?%s" % (provider_google['auth_endpoint'], werkzeug.url_encode(params))
                text_string = f'Kindly click on the link and login again for accessing Gmail Service.\n {link}'
                raise ValidationError(text_string)
        return build('gmail', 'v1', credentials=creds)

    def process_queue_job(self, payload, epoch_time):
        """Process Queue job records, and create mail if queue is related with Filter, Alias or Threads."""
        try:
            user = self.env['res.users'].sudo().search([('email', 'ilike', payload['emailAddress'])])
            if user:
                service = self.create_service(user)
                search_messages = service.users().messages().list(userId='me', q=f"after:{epoch_time}").execute()
                messages = search_messages.get('messages')
                if messages:
                    self.ks_check_messages(messages, service)
                if not messages:
                    last_unread = service.users().messages().list(userId='me',
                                                                  q=f"is:unread after:{int(datetime.now().timestamp()) - 300}").execute()
                    messages = last_unread.get('messages')
                    if messages:
                        self.ks_check_messages(messages, service)

        except Exception as e:
            _LOGGER.error(e)

    def ks_check_messages(self, messages=None, service=None):
        for msg in messages:
            message_id = msg.get('id')
            mail_present = self.env['mail.mail'].sudo().search(
                [('email_message_id', '=', message_id)])
            if not mail_present:
                try:
                    mail_mail = False
                    try:
                        message = service.users().messages().get(userId='me', id=message_id).execute()
                        if 'DRAFT' in message.get('labelIds', []):
                            continue
                    except Exception as e:
                        _LOGGER.error(e)
                    subject, sender_user, receiver_user, cc_receiver, bcc_receiver_user, odoo_object = self.ks_get_headers_data(
                        message['payload']['headers'])

                    message_state = 'sent' if 'SENT' in message.get('labelIds') else 'received'
                    message_type = 'sent' if 'SENT' in message.get('labelIds') else 'receive'
                    # if message_type == 'receive' and odoo_object and user_send:
                    #     continue
                    gmail_filters = self.env['gmail.filters'].sudo().search([])
                    gmail_alias = self.env['gmail.alias'].sudo().search([])
                    email_thread = self.sudo().search(
                        [('email_thread_id', '=', message['threadId'])], limit=1)
                    if odoo_object:
                        odoo_object = self.sudo().search(
                            [('references', 'ilike', odoo_object[:70])], limit=1)

                    if (odoo_object or email_thread) and not mail_present:
                        if email_thread:
                            context = dict(self.env.context)
                            context['threadId'] = email_thread.email_thread_id
                            self.env.context = context
                        model = email_thread.model or odoo_object.model
                        res_id = email_thread.res_id or odoo_object.res_id
                        body, body_html = self.ks_get_message_content(message['payload'])
                        mail_mail = self.sudo().ks_create_mail_mail(message, subject, sender_user,
                                                                    receiver_user, cc_receiver,
                                                                    bcc_receiver_user,
                                                                    body_html,
                                                                    mail=odoo_object or email_thread,
                                                                    state=message_state,
                                                                    gmail_type=message_type,
                                                                    model=model,
                                                                    res_id=res_id, body=body,
                                                                    references=odoo_object,
                                                                    parent_id=odoo_object or email_thread)
                        attachments = message['payload'].get('parts', [])
                        if attachments:
                            attachment_ids = self.get_attachment_ids(attachments, mail_mail, message,
                                                                     service)
                            mail_mail.write({'attachment_ids': [(6, 0, attachment_ids)]})
                    if mail_mail:
                        continue
                    if not mail_present:
                        for alias in gmail_alias:
                            sender_user, receiver_user_list, receiver_user_emails = self.ks_get_emails(
                                sender_user,
                                receiver_user)
                            if alias.name == sender_user or alias.name in receiver_user_emails:
                                body, body_html = self.ks_get_message_content(message['payload'])
                                attachments = message['payload'].get('parts', [])
                                context = dict(self.env.context)
                                context['is_filter'] = True
                                self.env.context = context
                                mail_mail = self.sudo().ks_create_mail_mail(message, subject,
                                                                            sender_user,
                                                                            receiver_user, cc_receiver,
                                                                            bcc_receiver_user,
                                                                            body_html,
                                                                            state=message_state,
                                                                            attachments=attachments
                                                                            , gmail_type=message_type,
                                                                            body=body, service=service,

                                                                            references=odoo_object)
                                break
                        if mail_mail:
                            continue
                        if not mail_mail:
                            for filter in gmail_filters:
                                related_mail = self.sudo().ks_get_related_filter(filter, subject)
                                if related_mail and not mail_present:
                                    body, body_html = self.ks_get_message_content(message['payload'])
                                    attachments = message['payload'].get('parts', [])
                                    context = dict(self.env.context)
                                    context['is_filter'] = True
                                    self.env.context = context
                                    self.sudo().ks_create_mail_mail(message, subject,
                                                                    sender_user,
                                                                    receiver_user,
                                                                    cc_receiver,
                                                                    bcc_receiver_user,
                                                                    body_html,
                                                                    state=message_state,
                                                                    attachments=attachments
                                                                    , gmail_type=message_type,
                                                                    body=body,
                                                                    service=service,
                                                                    references=odoo_object,
                                                                    )
                                    break
                except Exception as e:
                    _LOGGER.error(e)

    def cron_receive_email(self):
        """Receive mails for the odoo users. """

        cron_id = self.env.ref('ks_odoo_gmail_connector.ir_cron_receive_mail')
        # Calculate the cron last execution time
        cron_last_execution_time = cron_id.lastcall
        server = self.env['ir.config_parameter'].sudo().get_param('ks_odoo_gmail_connector.activate_gmail_service')
        if server == 'gmail_server':
            try:
                internal_group = self.env.ref('base.group_user')
                users = self.env['res.users'].search([('groups_id', '=', internal_group.id)])
                for user in users:
                    try:
                        if not user.oauth_access_token or not user.oauth_refresh_token:
                            continue
                        # Convert the time to epoch/unix timestamp
                        epoch_time = int(cron_last_execution_time.timestamp())
                        # Construct the search query with the datetime range
                        query = f'after:{epoch_time}'
                        service = self.create_service(user)
                        results = service.users().messages().list(userId='me', q=query).execute()
                        messages = results.get('messages', [])
                        if messages:
                            self.ks_check_messages(messages, service)
                    except:
                        continue

            except Exception as e:
                _LOGGER.error(e)

    def ks_get_message_content(self, payload):
        body = ''
        body_html = ''

        # Check if the payload contains parts
        if 'parts' in payload:
            parts = payload['parts']

            # Iterate over the parts to find the desired content
            for part in parts:
                if part['mimeType'] == 'text/html':
                    message_body = part['body']
                    data = message_body['data']
                    body_html = base64.urlsafe_b64decode(data).decode('UTF-8')
                    # converter = html2text.HTML2Text()
                    # body_html = converter.handle(message_data)
                    continue
                if part['mimeType'] == 'text/plain':
                    message_data = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                    content = message_data.split('wrote')[0].replace('\n', '<br/>')
                    body = f'<p>{content}</p>'
                    # body = converter.handle(message_data)
                    continue
                if part['mimeType'] == 'multipart/alternative':
                    if part.get('parts'):
                        for part in part.get('parts'):
                            if part['mimeType'] == 'text/html':
                                message_body = part['body']
                                data = message_body['data']
                                body_html = base64.urlsafe_b64decode(data).decode('UTF-8')
                                # converter = html2text.HTML2Text()
                                # body_html = converter.handle(message_data)
                                continue
                            if part['mimeType'] == 'text/plain':
                                message_data = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                                content = message_data.split('wrote')[0].replace('\n', '<br/>')
                                body = f'<p>{content}</p>'
                                # body = converter.handle(message_data)
                                continue
        return body, body_html

    def ks_get_related_filter(self, filter, subject):
        related_mail = False
        regex_filter = filter['name']
        filter_name = filter['name'].lower()
        contain_subject = filter_name in subject.lower()
        filter_len = len(filter_name.split())
        if filter['filter_type'] == 'regex' and re.search(rf'{regex_filter}', subject, re.IGNORECASE):
            related_mail = True
        elif filter['filter_type'] == 'contain' and contain_subject:
            related_mail = True
        elif filter['filter_type'] == 'start' and contain_subject:
            if filter_name.split() == subject.lower().split()[:filter_len]:
                related_mail = True
        elif filter['filter_type'] == 'end' and contain_subject:
            if filter_name.split() == subject.lower().split()[::-1][:filter_len][::-1]:
                related_mail = True
        return related_mail

    def ks_get_headers_data(self, headers):
        cc_receiver, bcc_receiver, from_user, to_user, subject, reference = '', '', '', '', '', None
        for header in headers:
            if header['name'] == 'Subject':
                subject = header['value']
            if header['name'] == 'From' or header['name'] == 'from':
                from_user = header['value']
            if header['name'] == 'Delivered-To' or header['name'] == 'To' or header['name'] == 'to':
                to_user = header['value']
            if header['name'] == 'Cc':
                cc_receiver = header['value']
            if header['name'] == 'Bcc':
                bcc_receiver = header['value']
            if header['name'] in ['References', 'references']:
                reference = header['value']
            if header['name'] == 'Message-ID' or header['name'] == 'Message-Id':
                context = dict(self.env.context)
                context['message_id'] = header['value']
                self.env.context = context
        return subject, from_user, to_user, cc_receiver, bcc_receiver, reference

    def get_attachment_ids(self, attachments, message, msg, service):
        attachment_ids = []
        for attachment in attachments:
            if 'filename' in attachment and attachment['body'].get('attachmentId'):
                filename = attachment['filename']
                mimetype = attachment['mimeType']
                attachment_id = attachment['body']['attachmentId']
                attachment_data = service.users().messages().attachments().get(
                    userId='me', messageId=message['id'], id=attachment_id
                ).execute()

                if 'data' in attachment_data:
                    decodes_string = base64.urlsafe_b64decode(attachment_data['data']
                                                              .encode('UTF-8'))
                    attachment_record = self.env['ir.attachment'].create(
                        {'name': filename, 'public': True,
                         'datas': base64.b64encode(decodes_string),
                         'res_model': message.model,
                         'res_id': message.res_id,
                         # 'datas_fname': filename,
                         'mimetype': mimetype,
                         'type': 'binary'})
                    attachment_ids.append(attachment_record.id)
        return attachment_ids

    def ks_get_emails(self, sender_user, receiver_user):
        sender_user = sender_user[sender_user.index('<') + 1:sender_user.index('>')] if len(
            sender_user.split('<')) > 1 else sender_user
        receiver_user_list = []
        receiver_user_emails = []
        if len(receiver_user) == 1:
            receiver_user = receiver_user[0]
        multiple_receiver = tools.email_split(receiver_user)
        if len(multiple_receiver) > 1:
            for receiver in multiple_receiver:
                receiver = receiver[receiver.index('<') + 1:receiver.index('>')] if len(
                    receiver.split('<')) > 1 else receiver
                receiver_id = self.env['res.partner'].sudo().search([('email', 'ilike', receiver)], limit=1)
                if not receiver_id:
                    receiver_id = self.ks_create_partner(receiver, receiver)
                receiver_user_list.append(receiver_id.id)
                receiver_user_emails.append(receiver)
        else:
            receiver_user = receiver_user[receiver_user.index('<') + 1:receiver_user.index('>')] if len(
                receiver_user.split('<')) > 1 else receiver_user
            receiver_id = self.env['res.partner'].sudo().search([('email', 'ilike', receiver_user)], limit=1)
            if not receiver_id:
                receiver_id = self.ks_create_partner(receiver_user, receiver_user)
            receiver_user_list.append(receiver_id.id)
            receiver_user_emails.append(receiver_user)
        return sender_user, receiver_user_list, receiver_user_emails

    def ks_create_mail_mail(self, msg, subject, sender_user, receiver_user, cc_receiver,
                            bcc_receiver_user, body_html, state, gmail_type, attachments=None, service=None,
                            model=None, res_id=None, body=None, references=None, parent_id=None, mail=False):

        """Create mail.mail record with all the required information."""
        sender_user, receiver_user_list, receiver_user_email = self.ks_get_emails(sender_user, receiver_user)
        author_id = self.env['res.partner'].sudo().search([('email', 'like', sender_user)], limit=1)

        if not author_id:
            author_id = self.env['res.partner'].sudo().create({'name': sender_user, 'email': sender_user})

        cc_bcc_user_list = []
        cc_bcc_receiver = []
        if cc_receiver:
            cc_bcc_receiver.extend(tools.email_split(cc_receiver))
        if bcc_receiver_user:
            cc_bcc_receiver.extend(tools.email_split(bcc_receiver_user))

        partner_ids = []
        for email, name in zip(cc_bcc_receiver, cc_receiver.split(',')):
            partner = self.env['res.partner'].search([('email', '=', email)], limit=1)
            if not partner:
                # match = re.match(r'(?!.*dont want to match)(.*) <(.*)>', cc_receiver)
                # name = match.group(1).strip()
                partner = self.env['res.partner'].sudo().create({'name': name, 'email': email})
            partner_ids.append(partner.id)
            cc_bcc_user_list.append(partner.id)
            if cc_bcc_user_list:
                invite_wizard = self.env['mail.wizard.invite'].create({
                    'res_model': model if model else 'res.partner',
                    'res_id': res_id if res_id else author_id.id,
                    'partner_ids': [(6, 0, partner_ids)],
                    'notify': True
                })
                invite_wizard.add_followers()

        body = self.env['mail.render.mixin']._replace_local_links(body)
        mail_mail = self.env['mail.mail'].sudo().create(
            {
                'body_html': body_html if body_html else body,
                'body': body if body else body_html,
                'subject': subject,
                'res_id': res_id if res_id else author_id.id,
                'recipient_ids': [(6, 0, receiver_user_list)],
                'model': model if model else 'res.partner',
                'author_id': author_id.id,
                'email_cc': cc_bcc_receiver,
                'references': references.references if references else None,
                'email_to': receiver_user,
                'email_from': sender_user,
                'auto_delete': True,
                'state': state,
                'message_type': 'comment',
                'date': datetime.now(),
                'email_message_id': msg.get('id'),
                'email_thread_id': self.env.context.get('threadId') or msg.get('threadId'),
                'gmail_type': gmail_type,
                'is_notification': True,
                'parent_mail_id': parent_id.id if parent_id else None,
                'cc_partner': [(6, 0, cc_bcc_user_list)],
                'message_id': self.env.context.get('message_id')
            })
        if self.env.context.get('is_filter') or mail_mail.model == 'res.partner':
            mail_message_id = self.env['mail.mail'].sudo().search(
                [
                    '|',
                    ('email_thread_id', '=', msg.get('threadId')),
                    ('message_id', '=', self.env.context.get('message_id')),
                    ('parent_id', '!=', False),
                    ('id', '!=', mail_mail.id),
                ],
                limit=1
            ).parent_id
            if not mail_message_id:
                mail_message_id = mail_mail.mail_message_id
                self.env.cr.commit()
            parent_message_id = mail_message_id.id
        else:
            parent_message_id = self.env['mail.message'].sudo().search(
                [('res_id', '=', res_id), ('model', '=', model)],
                limit=1, order='id asc').id
        mail_mail.write({
            'parent_id': parent_message_id
        })
        if mail_mail.state == 'received':
            user = self.env.context.get('user') if self.env.context.get('user') else None
            mail_mail.receiver_user = user.id
            if mail_mail.model == 'res.partner':
                if mail:
                    mail_mail.mail_message_id.is_composed = mail.mail_message_id.is_composed
                mail_mail.res_id = user.partner_id.id
            else:
                mail_mail.ks_show_in_thread = False
        if attachments:
            attachments = self.get_attachment_ids(attachments, mail_mail, msg,
                                                  service)
            mail_mail.write({'attachment_ids': [(6, 0, attachments)]})
        return mail_mail

    def ks_create_partner(self, name, email):
        """Create partner for the mail which is related not any related document for that"""
        partner_id = self.env['res.partner'].sudo().create({'name': name, 'email': email})
        self.env.cr.commit()
        return partner_id

    def ks_cron_create_watch(self):
        """Create a watch after every six day for the users to accessing the webhook"""
        try:
            internal_group = self.env.ref('base.group_user')
            users = self.env['res.users'].sudo().search([('groups_id', 'in', internal_group.id)])
            for user in users:
                six_days_before = datetime.now() - timedelta(days=6)
                if user.has_group('base.group_user') and not user.history_id or (user.history_change and
                                                                                 user.history_change.day == six_days_before.day and user.history_change.month == six_days_before.month):
                    client_id = self.env['ir.config_parameter'].sudo().get_param('google_gmail_client_id')
                    client_secret = self.env['ir.config_parameter'].sudo().get_param('google_gmail_client_secret')
                    topic_id = self.env['ir.config_parameter'].sudo().get_param('ks_odoo_gmail_connector.topic')
                    if client_id and client_secret and user.oauth_refresh_token and user.oauth_access_token and topic_id:
                        try:
                            service = user.env['mail.mail'].sudo().create_service(user)
                        except:
                            continue
                        request = {
                            'labelIds': ['SENT', 'INBOX', 'TRASH'],
                            'labelFilterAction': 'INCLUDE',
                            'topicName': topic_id,
                        }
                        history_id = service.users().watch(userId='me', body=request).execute()
                        user.sudo().write({'history_id': history_id['historyId'], 'history_change': datetime.now()})
        except Exception as e:
            _LOGGER.error(e)

    def ks_logout_user(self):
        setting = self.env['res.config.settings'].sudo().search([], order='id desc', limit=1)
        google_provider = self.env.ref('auth_oauth.provider_google', False)
        if setting.google_gmail_client_identifier and setting.google_gmail_client_secret and google_provider.enabled:
            internal_group = self.env.ref('base.group_user')
            users = self.env['res.users'].sudo().search(
                ['&', '|', ('oauth_refresh_token', '=', False), ('oauth_access_token', '=', False),
                 ('groups_id', 'in', internal_group.id)])
            for user in users:
                user.logout = True


class MailMessage(models.Model):
    _inherit = 'mail.message'

    email_cc = fields.Many2many('res.partner', 'mail_message_mail_compose_rel', 'mail_message_id', 'partner_id',
                                string="Email Cc")
    email_thread_id = fields.Char(string="Email Thread ID")
    is_composed = fields.Boolean(string='Composed')

    @api.model
    def search(self, args, offset=0, limit=None, order=None, count=False, access_rights_uid=None):
        res = super(MailMessage, self).search(args, offset=offset, limit=limit, order=order, )
        if res:
            mails = []
            for mail in res:

                mail_mail = self.env['mail.mail'].sudo().search([('mail_message_id', '=', mail.id)], limit=1)
                if mail_mail.state == 'received' and (
                        mail_mail.sender_user or mail_mail.receiver_user.id != self.env.uid) and not mail_mail.mail_message_id.is_composed:
                    continue
                else:
                    mails.append(mail.id)
            res = self.browse(mails)

        return res


class MailComposeMessage(models.TransientModel):
    _inherit = 'mail.compose.message'

    email_cc = fields.Many2many('res.partner', 'mail_mail_mail_compose_rel', 'mail_id', 'partner_id',
                                string="Email Cc")
    email_thread_id = fields.Char(string="Email Thread ID")

    def _prepare_mail_values(self, res_ids):
        res = super(MailComposeMessage, self)._prepare_mail_values(res_ids)

        try:
            if self.email_cc:
                res[res_ids[0]]['email_cc'] = [(6, 0, self.email_cc.ids)]
                model = self._context.get('default_model')
                res_id = self._context.get('default_res_ids')
                if model and res_id:
                    record = self.env[model].sudo().browse(res_id)
                    record.message_partner_ids = [(6, 0, record.message_partner_ids.ids + self.email_cc.ids)]
            context = dict(self.env.context)
            context['is_composed'] = True
            if self.parent_id:
                model = self._context.get('active_model')
                res_id = self._context.get('active_id')
                if model and res_id:
                    context['is_reply'] = True
                    mail = self.env['mail.mail'].sudo().search(
                        [('res_id', '=', res_id), ('model', '=', model), ('email_thread_id', '!=', False)], limit=1)
                    res[res_ids[0]]['email_thread_id'] = mail.email_thread_id

            self.env.context = context
        except:
            return res
        return res

    @api.model
    def default_get(self, fields):
        res = super(MailComposeMessage, self).default_get(fields)
        model = self._context.get('default_model')
        res_id = self._context.get('default_res_ids')
        if model and res_id:
            record = self.env[model].sudo().browse(res_id)
            try:
                res.get('partner_ids')[0][2].extend(record.message_partner_ids.ids)
            except Exception as e:
                _LOGGER.error(e)
        if self._context.get('active_model') and self._context.get('active_id'):
            model = self._context.get('active_model')
            res_ids = [self._context.get('active_id')]
            email_cc = self.env[model].sudo().browse(res_ids)

            if email_cc._name == 'mail.mail' or email_cc._name == 'mail.message':
                cc_users = email_cc.cc_partner.ids
                if email_cc.state == 'received':
                    cc_users += email_cc.mapped('recipient_ids').ids
                    partner_id = self.env.user.partner_id
                    index = cc_users.index(partner_id.id) if partner_id.id in cc_users else None
                    if index or index == 0:
                        cc_users.pop(index)
                    index = cc_users.index(email_cc.author_id.id) if email_cc.author_id.id in cc_users else None
                    if index or index == 0:
                        cc_users.pop(index)
                res['email_cc'] = [(6, 0, cc_users)]
                # res['model'] = email_cc.model
                # res['res_id'] = email_cc.res_id

                res['parent_id'] = email_cc.parent_id.id or email_cc.mail_message_id.id
                if email_cc.state == 'sent':
                    res['partner_ids'] = [(6, 0, email_cc.recipient_ids.ids or email_cc.partner_ids.ids)]
                elif email_cc.state == 'received':
                    res['partner_ids'] = [(6, 0, email_cc.author_id.ids)]
        return res

    def _action_send_mail(self, auto_commit=False):
        """ Process the wizard content and proceed with sending the related
            email(s), rendering any template patterns on the fly if needed.

        :return tuple: (
            result_mails_su: in mass mode, sent emails (as sudo),
            result_messages: in comment mode, posted messages
        )
        """
        result_mails_su, result_messages = self.env['mail.mail'].sudo(), self.env['mail.message']

        for wizard in self:
            if wizard.res_domain:
                search_domain = wizard._evaluate_res_domain()
                search_user = wizard.res_domain_user_id or self.env.user
                res_ids = self.env[wizard.model].with_user(search_user).search(search_domain).ids
            else:
                res_ids = wizard._evaluate_res_ids()
            if not res_ids:
                res_ids = [wizard.id]
            # in comment mode: raise here as anyway message_post will raise.
            if not res_ids and wizard.composition_mode == 'comment':
                raise ValueError(
                    _('Mail composer in comment mode should run on at least one record. No records found (model %(model_name)s).',
                      model_name=wizard.model)
                )

            if wizard.composition_mode == 'mass_mail':
                result_mails_su += wizard._action_send_mail_mass_mail(res_ids, auto_commit=auto_commit)
            else:
                result_messages += wizard._action_send_mail_comment(res_ids)

        return result_mails_su, result_messages


class KsMailThread(models.AbstractModel):
    _inherit = 'mail.thread'

    def _get_message_create_valid_field_names(self):
        """ Some fields should not be given when creating a mail.message from
                mail.thread main API methods (in addition to some API specific check).
                Those fields are generally used through UI or dedicated methods. We
                therefore give an allowed field names list. """
        return {
            'attachment_ids',
            'author_guest_id',
            'author_id',
            'body',
            'create_date',  # anyway limited to admins
            'date',
            'email_add_signature',
            'email_from',
            'email_layout_xmlid',
            'is_internal',
            'mail_activity_type_id',
            'mail_server_id',
            'message_id',
            'message_type',
            'model',
            'parent_id',
            'partner_ids',
            'record_alias_domain_id',
            'record_company_id',
            'record_name',
            'reply_to',
            'reply_to_force_new',
            'res_id',
            'subject',
            'subtype_id',
            'tracking_value_ids',
            'email_cc',
            'email_thread_id'
        }
