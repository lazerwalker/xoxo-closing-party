// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
const fetch = require("node-fetch");

const fetchUser = async function (id) {
  const userRequest = await fetch(
    `https://slack.com/api/users.list?token=${process.env.SlackAccessToken}`
  ).then(response => response.json());
  const users = userRequest.members || [];

  return users.find(u => u.id === id);
}

module.exports = async function (context, req) {
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
    event.channel === process.env.SlackChannelId &&
    event.type === "message" &&
    event.subtype !== "message_deleted"
  ) {


    let response = {
      timestamp: event.ts,
      user: event.user
    };

    const user = await fetchUser(event.user)
    if (user) {
      response.username = user.name;
      response.name = user.real_name;
    }

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