# -*- coding: utf-8 -*-

from odoo import models, api, fields


class GmailFilters(models.Model):
    _name = "gmail.filters"
    _description = "Gmail Filters"

    name = fields.Char(string='Filter Name', required=True)
    filter_type = fields.Selection(
        [('start', 'Starts With'), ('contain', 'Contains'), ('end', 'Ends With'), ('regex', 'Regular Expression')],
        string='Apply Domain', required=True)
