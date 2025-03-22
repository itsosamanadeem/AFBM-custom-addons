from odoo import fields, models, api, _

class RealEstateInherit(models.Model):
    _inherit = "property.property"

    project = fields.Char(string="Project Name")
    total_floor_count = fields.Integer(string="Total Floor Count")

    floor_id = fields.Many2one("property.floor", string="Floor Number",domain="[('name', '<=', total_floor_count)]" )

    @api.onchange('floor_id')
    def _check_floor_limit(self):
        if self.floor_id and self.total_floor_count and self.floor_id.name > self.total_floor_count:
            self.floor_id = False  
            return {
                'warning': {
                    'title': "Invalid Floor Selection",
                    'message': f"You cannot select a floor greater than {self.total_floor_count}.",
                }
            }

