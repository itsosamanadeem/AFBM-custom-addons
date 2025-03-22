from odoo.http import Controller, route, request
from odoo.exceptions import UserError
from odoo import http

class UpdateSchedule(http.Controller):
    @route('/update/employee/schedule', methods=['POST'], type='json', auth="public", website=True, csrf=False)
    def update_schedule(self, **kw):
        if not kw.get('recordId'):
            raise UserError("Missing 'recordid' in request parameters.")
        
        schedule_line = request.env['employee.working.schedule'].search([]).mapped('working_schedule_ids')
        for id in schedule_line:
            if id.id == kw.get('recordId'):
                sh=id.write({
                    'start_time': kw.get('newValue'),
                })
        return {'updated_start_time': kw.get('newValue')}
        
