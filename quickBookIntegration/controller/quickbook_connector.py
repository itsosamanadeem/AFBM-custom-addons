from odoo import http
from odoo.http import request
import requests
from requests.auth import HTTPBasicAuth
import logging

_logger = logging.getLogger(__name__)

class QuickBooksAuth(http.Controller):
    CLIENT_ID = "AB8qWstxdxLhBGyXaNG1Ms0r0q0ZOvTLRM3svjCeuQFQsMtkow"
    CLIENT_SECRET = "6tZTuufCTmrMR64IDVzKE1SHzT0mcTNjlTqCviUk"
    REDIRECT_URI = "https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl"
    TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

    @http.route('/web/callback', methods=['GET'], auth="public", type='http', website=True)
    def callback(self, **kwargs):
        """ Exchange authorization code for access token and return it in response """
        # auth_code = kwargs.get('code')  # Get auth code from URL
        auth_code = "AB11738561745Y3Ayzv2bFftIjNrVu0n9bJ76lya42zm6tcud8"  # Get auth code from URL

        if not auth_code:
            return http.Response("Authorization failed. No code received.", status=400)

        # Exchange auth code for access token
        response = requests.post(
            self.TOKEN_URL,
            auth=HTTPBasicAuth(self.CLIENT_ID, self.CLIENT_SECRET),
            data={
                "grant_type": "authorization_code",
                "code": auth_code,
                "redirect_uri": self.REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )

        if response.status_code != 200:
            _logger.error(f"Failed to get access token: {response.status_code} - {response.text}")
            return http.Response(f"Failed to retrieve access token: {response.text}", status=400)


        token_data = response.json()
        access_token = token_data.get("access_token")

        # Log the access token
        _logger.info(f"QuickBooks Access Token: {access_token}")

        
        return http.Response(f"Access Token: {access_token}", status=200)
