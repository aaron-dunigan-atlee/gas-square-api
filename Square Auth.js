
/**
 * Square API Auth
 * Docs at https://developer.squareup.com/docs
 * Requires the OAuth2 Library: https://github.com/googleworkspace/apps-script-oauth2
 * 
 */

/**
 * Reset the authorization state, so that it can be re-tested.
 */
function resetSquareService()
{
  getSquareService().reset();
}

/**
 * Configures the service.
 */
function getSquareService()
{
  var SQUARE_CLIENT_SECRET = SQUARE_SANDBOX ?
    '{your square sandbox secret}'
    : '{your square production secret}'
  var SQUARE_CLIENT_ID = SQUARE_SANDBOX ?
    '{your square sandbox client id}'
    : '{your square production client id}'


  return OAuth2.createService('Square')
    // Set the endpoint URLs.
    .setAuthorizationBaseUrl(Square.BASE_URL + '/oauth2/authorize')
    .setTokenUrl(Square.BASE_URL + '/oauth2/token')

    // Set the client ID and secret.
    .setClientId(SQUARE_CLIENT_ID)
    .setClientSecret(SQUARE_CLIENT_SECRET)

    // Set the name of the callback function that should be invoked to
    // complete the OAuth flow.
    .setCallbackFunction('authCallbackSquare')

    // Set the property store where authorized tokens should be persisted.
    // Change this to .getUserProperties() if you are having multiple google users authorize the service: 
    // this will prevent one user's token from being visible to others.
    .setPropertyStore(PropertiesService.getScriptProperties())

    // Set the scopes needed.  For a full list see https://developer.squareup.com/docs/oauth-api/square-permissions
    .setScope(
      [
        'ORDERS_WRITE',
        'PAYMENTS_WRITE',
        'PAYMENTS_READ',
        'ORDERS_READ',
        'MERCHANT_PROFILE_READ'
      ]
        .join(" ")
    )
    // Set grant type
    .setGrantType('authorization_code')

}

/**
 * Handles the OAuth callback.
 */
function authCallbackSquare(request)
{
  var service = getSquareService();

  // Now process request
  var authorized = service.handleCallback(request);
  if (authorized)
  {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else
  {
    return HtmlService.createHtmlOutput('Denied. You can close this tab.');
  }
}


/**
 * Authorize user in a sidebar.
 * @param {Service} service 
 */
function authorizeSquareUser()
{
  var service = getSquareService();
  var authorizationUrl = service.getAuthorizationUrl();
  var template = HtmlService.createTemplateFromFile('square/auth-sidebar');
  template.authorizationUrl = authorizationUrl;
  console.log("Auth URL is %s", authorizationUrl);
  template.service = "Square"
  var page = template.evaluate().setTitle('Authorize Square').setSandboxMode(HtmlService.SandboxMode.IFRAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
  SpreadsheetApp.getUi().showSidebar(page);
}

function logRedirectUri()
{
  console.log(
    OAuth2.getRedirectUri()
  )
}

/**
 * Store current square user token in case we need to authorize another user
 */
function storeSquareToken()
{
  var service = getSquareService();
  // Store current user before handling new one.
  var storage = service.getStorage()
  var currentAuth = storage.getValue(null)
  if (currentAuth)
  {
    console.log("Storing current Square user: " + currentAuth.merchant_id)
    storage.setValue(currentAuth.merchant_id, currentAuth)
  }

}


/**
 * Store current square user token in case we need to authorize another user
 */
function storeSquareSandboxToken()
{
  var service = getSquareService();
  // Store sandbox user before handling new one.
  var storage = service.getStorage()
  var currentAuth = storage.getValue(null)
  if (currentAuth)
  {
    console.log("Storing sandbox Square user: " + currentAuth.merchant_id)
    storage.setValue("sandbox", currentAuth)
  }

}

/**
 * Get access token for sandbox mode
 */
function getSquareSandboxToken()
{
  var service = getSquareService();
  // Store current user before handling new one.
  var storage = service.getStorage()
  var token = storage.getValue("sandbox")
  if (!token)
  {
    throw new Error("No sandbox token available")
  }
  console.log("Sandbox token is %s", token.access_token)
  return token.access_token
}

/**
 * Swap out the current user token so we can access the desired account
 * @param {number} merchantId 
 */
function setSquareUser(merchantId)
{
  merchantId = merchantId || "{your merchant id}"
  var storage = getSquareService().getStorage()
  var currentAuth = storage.getValue(null)
  if (currentAuth)
  {
    console.log("Current Square user is " + currentAuth.merchant_id)
    if (currentAuth && currentAuth.merchant_id == merchantId)
    {
      // User is already current
      return
    }
    // Store current token for later use.
    storage.setValue(currentAuth.merchant_id, currentAuth)
  }
  // Get token for userId and make it the current token
  var newAuth = storage.getValue(merchantId)
  if (!newAuth)
  {
    var errorMesage = "User " + merchantId + "is not registered"
    logError(errorMesage)
    throw new Error(errorMesage)
  }
  storage.setValue(null, newAuth)
  console.log("Changed Square user to " + newAuth.merchant_id)
}

/**
 * Run on a daily trigger to refresh authorization token
 */
function refreshSquareToken()
{
  try
  {
    console.log(JSON.stringify(
      Square.getMerchant()
    ))
  } catch (err)
  {
    notifyError(err, true, "Failed to refresh Square token")
  }
}