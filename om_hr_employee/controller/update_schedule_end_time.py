from odoo.http import Controller, route, request
from odoo.exceptions import UserError
from odoo import http

class UpdateEndTimeSchedule(http.Controller):
    @route('/update/employee/schedule/endtime', methods=['POST'], type='json', auth="public", website=True, csrf=False)
    def update_end_time_schedule(self, **kw):
        if not kw.get('recordId'):
            raise UserError("Missing 'recordid' in request parameters.")
        
        schedule_line = request.env['employee.working.schedule'].search([]).mapped('working_schedule_ids')
        for id in schedule_line:
            if id.id == kw.get('recordId'):
                sh=id.write({
                    'end_time': kw.get('newValueEndTime')
                })
        return {'updated_end_time': kw.get('newValueEndTime')}
        
