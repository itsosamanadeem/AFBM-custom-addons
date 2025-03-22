from odoo import models, fields, api
from odoo.exceptions import UserError


class product_template(models.Model):
    _inherit="product.template"

    sale_price_discount= fields.Float(string="S.P Discount", compute="_compute_sale_price_discount")

    product_discount=fields.Float(string="Product discount")

    price_list_id= fields.Many2one('product.pricelist', string="Price List")

    isCategory= fields.Boolean(string="Is Category", default=True)
    
    @api.onchange('price_list_id')
    def _onchange_field_name(self):
        for record in self:
            if record.isCategory: 
                discount = self.env['product.pricelist.item'].search([
                    ('pricelist_id', '=', record.price_list_id.id),
                    ('categ_id', '=', record.categ_id.id)
                ], limit=1)
            else:
                discount = self.env['product.pricelist.item'].search([
                    ('pricelist_id', '=', record.price_list_id.id),
                    ('product_tmpl_id', '=', record.id)  # Change applied here
                ], limit=1)

            if discount:
                if discount.percent_price:
                    record.product_discount = discount.percent_price
                elif discount.fixed_discount:
                    record.product_discount = discount.fixed_discount
            else:
                record.product_discount = 0.0


    def _compute_sale_price_discount(self):
        for record in self:
            if record.isCategory: 
                discount = self.env['product.pricelist.item'].search([
                    ('pricelist_id', '=', record.price_list_id.id),
                    ('categ_id', '=', record.categ_id.id)
                ], limit=1)
            else:
                discount = self.env['product.pricelist.item'].search([
                    ('pricelist_id', '=', record.price_list_id.id),
                    ('product_tmpl_id', '=', record.id)  # Change applied here
                ], limit=1)

            if discount:
                if discount.percent_price:
                    record.sale_price_discount = record.list_price - ((record.list_price * discount.percent_price) / 100)
                elif discount.fixed_discount:
                    record.sale_price_discount = record.list_price - discount.fixed_discount
            else:
                record.sale_price_discount = record.list_price  
