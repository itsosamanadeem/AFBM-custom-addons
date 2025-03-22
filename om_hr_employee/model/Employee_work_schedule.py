from odoo import api, fields, models, _
from odoo.tools import date_utils, float_round
from odoo.exceptions import ValidationError, UserError
import pytz
import logging
_logger = logging.getLogger(__name__)

class EmployeeWorkingSchedule(models.Model):
    _name = 'employee.working.schedule'
    _description = 'Employee Working Schedule'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Name', required=True, tracking=True)
       
    working_schedule_ids = fields.One2many(
        comodel_name='employee.working.schedule.line', 
        inverse_name='schedule_id',                    
        string="Working Schedule",
        tracking=True
    )

    average_hours_per_week = fields.Float(
        string="Average Hours",
        store=True,
        compute="_compute_average_hours",
        digits=(2, 2),
        tracking=True
    )

    @api.depends("working_schedule_ids") 
    def _compute_average_hours(self):
        for record in self:
            record.average_hours_per_week = 8.0 
            _logger.info(f"this is the {record} and value of field {self.average_hours_per_week}")
            # raise UserError(str(cal))


    time_zone = fields.Selection(
        selection=[(tz, tz) for tz in sorted(pytz.all_timezones)],
        string="Time Zone",
        default=lambda self: self._default_time_zone(),
        required=True,
        tracking=True
    )

    @api.model
    def _default_time_zone(self):
        return self.env.user.tz or 'UTC'

    def schedule_four_weeks(self):
        for rec in self:
            rec.working_schedule_ids.unlink()

            shifts = [
                ('Morning', 8.0, 12.0),
                ('Break', 12.0, 13.0),
                ('Afternoon', 13.0, 17.0)
            ]
            days = [
                ('0', 'Monday'), ('1', 'Tuesday'), ('2', 'Wednesday'),
                ('3', 'Thursday'), ('4', 'Friday'), ('5', 'Saturday')
            ]

            schedule_lines = []
            for week in range(1, 5):
                # Add a separator
                schedule_lines.append({
                    'name': f'Week {week} Separator',
                    'day_of_week': '',
                    'shift': '',
                    'start_time': '',
                    'end_time': '',
                    'schedule_id': rec.id,
                })
                for day_code, day_name in days:
                    for shift_name, start_time, end_time in shifts:
                        # raise UserError(f'{start_time, end_time}')
                        schedule_lines.append({
                            'name': f'{day_name} {shift_name}',
                            'day_of_week': day_code,
                            'shift': shift_name.lower(),
                            'start_time': start_time,
                            'end_time': end_time,
                            'schedule_id': rec.id,
                        })
                schedule_lines.append({
                    'name': "Sunday",
                    'day_of_week': '6',
                    'shift': '',
                    'start_time': 8,
                    'end_time': 17,
                    'schedule_id': rec.id,
                })
            self.env['employee.working.schedule.line'].create(schedule_lines)

    def delete_schedule(self):
        for rec in self:
            # raise UserError(self.working_schedule_ids)
            if rec.working_schedule_ids:
                rec.working_schedule_ids.unlink()
            else:
                raise UserError(_("There are no schedules to delete for '%s'.") % rec.name)


# Define the related model for the One2many relation
class EmployeeWorkingScheduleLine(models.Model):
    _name = 'employee.working.schedule.line'
    _description = 'Employee Working Schedule Line'

    name = fields.Char(string="Name")
    day_of_week=fields.Selection(selection=[
            ('0','Monday'),
            ('1','Tuesday'),
            ('2','Wednesday'),
            ('3','Thursday'),
            ('4','Friday'),
            ('5','Saturday'),
            ('6','Sunday'),
        ],
        string="Day Of Week",
        default='0',
        tracking=True
    )
    shift=fields.Selection(selection=[
        ('morning','Morning'),
        ('break','Launch'),
        ('afternoon','Afternoon')
    ], string="Day Shift",default='morning', tracking=True)

    start_time = fields.Float(string="Start Time",tracking=True)
    # launch_break= fields.Float(string='Launch time',tracking=True)
    end_time = fields.Float(string="End Time",tracking=True)
    schedule_id = fields.Many2one(
        comodel_name='employee.working.schedule',
        string="Employee Working Schedule",
        tracking=True
    )