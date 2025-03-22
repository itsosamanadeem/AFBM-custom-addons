from odoo import fields, models, api, _
from odoo.exceptions import ValidationError
class PropertyFloor(models.Model):
    _name = "property.floor"
    _description = "Property Floor"
    _sql_constraints = [
        ('unique_floor_number', 'unique(name)', 'Floor number must be unique!')
    ]

    name = fields.Integer(string="Floor Number", required=True)

    @api.constrains('name')
    def _check_unique_floor(self):
        for record in self:
            existing_floor = self.search([('name', '=', record.name)])
            if len(existing_floor) > 1:
                raise ValidationError(
                    f"Floor number {record.name} already exists! Please enter a unique floor number."
                )