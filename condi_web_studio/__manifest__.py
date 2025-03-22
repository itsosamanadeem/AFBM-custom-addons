# -*- coding: utf-8 -*-
# See LICENSE file for full copyright and licensing details.
{
    'name': "Odoo WebStudio Block",
    'summary': "The Odoo Webstudio Block does not allow direct customization of views from the Studio Menu.",
    'website': 'https://www.condigroup.com/',
    'description': """
Studio - Customize Odoo
=======================

This addon restricts users from customizing the user interface through Studio. 

It blocks the Studio Menu in the top breadcrumb, preventing users from accessing the customization options. 

Additionally, it removes the "Add Custom Field" option from the list view. 

However, once the user gains access to the appropriate group, they will be able to utilize these customization features.
""",
    'category': 'Customizations/Studio',

    # Author
    'author': 'Condi Group Inc.',
    'maintainer': 'Condi Group Inc.',

    'sequence': 1,
    'version': '1.0',
    'depends': [
        'web', 'web_studio', 'web_enterprise'
    ],
    'data': [
        'security/studio_security.xml',
    ],
    'images': [
        'static/description/banner.gif'
    ],
    'application': True,
    'license': 'OPL-1',
    'price': 0,
    'currency': 'USD',
    'support': 'odoo@condigroup.com',
    'assets': {
        'web.assets_backend': [
            'condi_web_studio/static/src/views/**/list_renderer_desktop.js',
            ('remove', 'web_studio/static/src/systray_item/systray_item.js'),
            'condi_web_studio/static/src/studio_service.js',
        ],
    }
}
