from odoo import api, fields, models
from odoo.exceptions import UserError

class InheritResPartner(models.Model):
    _inherit = "res.partner"

    country_id = fields.Many2one('res.country', string="Country", store=True, default=lambda self: self._get_default_country())

    def _get_default_country(self):
        return self.env['res.country'].search([('name', '=', 'Pakistan')], limit=1)
