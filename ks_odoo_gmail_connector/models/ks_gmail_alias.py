# -*- coding: utf-8 -*-

from odoo import models, api, fields, _
from odoo.exceptions import ValidationError
import re

# Make a regular expression
# for validating an Email
regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'


class GmailAlias(models.Model):
    _name = "gmail.alias"
    _description = 'Gmail Aliases'

    name = fields.Char(string='Alias Name', required=True)
    model_id = fields.Many2one('ir.model', string='Model')

    @api.constrains('name')
    def check_email(self):
        if not re.fullmatch(regex, self.name):
            raise ValidationError(_('Please Enter Valid Email Address.'))

