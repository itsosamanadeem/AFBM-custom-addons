from odoo import models, fields, api
from odoo.exceptions import UserError, ValidationError
import logging
_logger = logging.getLogger(__name__)


class sale_order(models.Model):
    _inherit="sale.order"

    state= fields.Selection([
        ('draft', "Quotation"),
        ('sent', "Quotation Sent"),
        ('sale', "Sales Order"),
        ('cancel', "Cancelled"),
        ('urgent_order','Urgent Order')
    ])

    is_urgent=fields.Boolean(string="Is Urgent")
    
    def action_confirm(self):
        res = super(sale_order, self).action_confirm()
        if self.is_urgent:
            self.write({'state': 'urgent_order'})
        return res

    @api.constrains('order_line')
    def _check_duplicate_products(self):
        for order in self:
            product_ids = order.order_line.mapped('product_id.id')
            if len(product_ids) != len(set(product_ids)):
                raise ValidationError("Duplicate products are not allowed in order lines.")

class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    @api.model
    def create(self, vals):
        order = self.env['sale.order'].browse(vals.get('order_id'))
        product_id = vals.get('product_id')

        if order and product_id:
            existing_products = order.order_line.mapped('product_id.id')
            if product_id in existing_products:
                raise ValidationError("Duplicate products are not allowed in order lines.")

        return super(SaleOrderLine, self).create(vals)
