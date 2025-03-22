from odoo import models, fields, api
from odoo.exceptions import UserError

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    @api.model
    def create(self, vals):
        # Check if a product with the same name (case-insensitive) exists
        if 'name' in vals and self.search([('name', 'ilike', vals['name'])], limit=1):
            raise UserError(f"A product with the name '{vals['name']}' already exists (case-insensitive)!")
        return super(ProductTemplate, self).create(vals)

    def write(self, vals):
        # Check if the product name is being updated
        if 'name' in vals:
            for record in self:
                if self.search([
                    ('name', 'ilike', vals['name']),  # Case-insensitive comparison
                    ('id', '!=', record.id)  # Exclude current record
                ], limit=1):
                    raise UserError(f"A product with the name '{vals['name']}' already exists (case-insensitive)!")
        return super(ProductTemplate, self).write(vals)
