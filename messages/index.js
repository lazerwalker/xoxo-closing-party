// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const Channel = "GMZ38044W";

module.exports = async function(context, req) {
  console.log(req.body);
  const payload = req.body;
  if (payload.type === "url_verification") {
    // WARNING: Here, and with all requests, we _should_ be verifying the signature of the request
    // For our purposes, shrug.
    context.res = {
      status: 200,
      body: JSON.stringify({
        challenge: payload.challenge
      })
    };
  } else {
    context.res = {
      status: 200
    };
  }

  const event = payload.event;
  if (
    event &&
    event.channel === Channel &&
    event.type === "message" &&
    event.subtype !== "message_deleted"
  ) {
    let response = {
      timestamp: event.ts,
      user: event.user
    };

    if (event.text !== "") {
      response.text = event.text;
    }

    if (event.attachments && event.attachments[0]) {
      const giphy = event.attachments[0];

      if (giphy.image_url !== undefined) {
        response.url = giphy.image_url;
      }

      if (giphy.image_width !== undefined) {
        response.width = giphy.image_width;
      }

      if (giphy.image_height !== undefined) {
        response.height = giphy.image_height;
      }
    }

    return {
      target: "newMessage",
      arguments: [response]
    };
  }
};
