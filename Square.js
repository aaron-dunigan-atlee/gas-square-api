var SQUARE_SANDBOX = false // Set to true for sandbox mode
var DEBUG = true; // More logging
/**
 * Utilities for interfacing with Square
 */
var Square = (function (ns)
{
  ns = ns || {}
  ns.BASE_URL = SQUARE_SANDBOX ?
    'https://connect.squareupsandbox.com' // Sandbox
    : 'https://connect.squareup.com' // Production

  // Location id associated with merchant account  
  LOCATION_ID = "{your location id}"

  ns.getMerchant = function ()
  {
    return callSquare("get", "/v2/merchants/me")
  }

  ns.getOrder = function (orderId)
  {
    return callSquare("get", "/v2/orders/" + orderId)
  }

  ns.searchOrders = function ()
  {
    return callSquare(
      "post",
      "/v2/orders/search",
      {
        "location_ids": [LOCATION_ID],
        "query": {
          "filter": {
            "state_filter": {
              "states": [
                "OPEN"
              ]
            }
          }
        }
      }
    )
  }

  ns.getPayment = function (paymentId)
  {
    return callSquare("get", "/v2/payments/" + paymentId)
  }

  ns.listPayments = function ()
  {
    return callSquare("get", "/v2/payments/")
  }

  /**
   * For a payment that has already been approved but not charged,
   * complete the payment by charging the card
   */
  ns.completePayment = function (paymentId)
  {
    return callSquare("post", "/v2/payments/" + paymentId + "/complete")
  }

  ns.cancelPayment = function (paymentId)
  {
    return callSquare("post", "/v2/payments/" + paymentId + "/cancel")
  }

  /**
   * Update the payment amount for an existing payment
   * @param {string} paymentId 
   * @param {integer} paymentAmount In CENTS
   * @returns 
   */
  ns.updatePaymentAmount = function (paymentId, paymentAmount)
  {
    var payload = {
      "idempotency_key": Utilities.getUuid(),
      "payment": {
        "amount_money": {
          "amount": paymentAmount,
          "currency": "USD"
        }
      }
    };
    return callSquare("put", "/v2/payments/" + paymentId, payload)
  }

  return ns;

  // -----------------
  // Private functions

  /**
   * Make a call to the Square API
   * @param {string} method GET, PUT, POST, DELETE
   * @param {string} endpoint 
   * @param {Object} payload 
   * @returns {Object} The API response.
   */
  function callSquare(method, endpoint, payload)
  {

    var params = {
      'method': method,
      'headers': getHeaders()
    };
    params.muteHttpExceptions = true; // We catch error messages and parse them below.
    if (payload) params.payload = JSON.stringify(payload)

    if (DEBUG) console.log("Calling Square using url %s", ns.BASE_URL + endpoint)
    var response =
      UrlFetchApp.fetch(ns.BASE_URL + endpoint, params)
    var content = response.getContentText();
    if (DEBUG) console.log("Response code %s", response.getResponseCode())
    // Some endpoints return empty response.
    if (!content) return null;
    if (DEBUG) console.log(content)
    var json = JSON.parse(content);
    // Square responses may contain error messages. Log and throw these.
    if (json.errors && json.errors.length > 0)
    {
      var errorMessage = json.errors.map(function (e)
      {
        return e.code + " " + e.category + (e.field ? " (" + e.field + ")" : "") + (e.detail ? ": " + e.detail : "")
      }).join('\n')
      throw new Error(errorMessage)
    }
    if (response.getResponseCode() !== 200) throw new Error("Unknown error accessing Square API")
    return json;
  }


  function getHeaders()
  {
    var header = {
      'Authorization': 'Bearer ' + (SQUARE_SANDBOX ? getSquareSandboxToken() : getSquareService().getAccessToken()),
      'Square-Version': '2021-05-13',
      'Content-Type': 'application/json'
    }
    return header
  }

})()
