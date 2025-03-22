{
    'name': 'Quickbook Connector',
    'summary': 'Quickbook Connector.',
    'author': 'Osama Nadeem',
    'sequence': '-100',
    'license': 'LGPL-3',
    'depends': ['base', 'sale', 'product','purchase'],
    'data': [
        'security/ir.model.access.csv',
        'views/quick_book_connector.xml',
    ],
    'demo': [],
    'installable': True,
    'application': True,
    'auto_install': True,
}
