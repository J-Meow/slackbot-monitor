async function getResponses() {
    return (
        await (
            await fetch(
                "https://hackclub.slack.com/api/slackbot.responses.list",
                {
                    headers: {
                        cookie: "d=" + Deno.env.get("SLACK_XOXD"),
                        "content-type": "multipart/form-data; boundary=bound",
                    },
                    body: `--bound
Content-Disposition: form-data; name="token"

${Deno.env.get("SLACK_XOXC")}
--bound--`,
                    method: "POST",
                },
            )
        ).json()
    ).responses
}
let prevResponses
try {
    prevResponses = JSON.parse(await Deno.readTextFile("./responses.json"))
} catch (_) {
    prevResponses = await getResponses()
    await Deno.writeTextFile("./responses.json", JSON.stringify(prevResponses))
}
async function check() {
    const newResponses = await getResponses()
    const added = []
    const modified = []
    const removed = []
    newResponses.forEach((response) => {
        const prevResponsesWithSameId = prevResponses.filter(
            (x) => x.id == response.id,
        )
        if (prevResponsesWithSameId.length === 0) {
            added.push(response.id)
        } else if (prevResponsesWithSameId.length === 1) {
            if (prevResponsesWithSameId[0].edited != response.edited) {
                modified.push(response.id)
            }
        } else {
            console.log(
                "uhhh something weird happened",
                prevResponsesWithSameId,
            )
        }
    })
    prevResponses.forEach((response) => {
        if (!newResponses.find((x) => x.id == response.id)) {
            removed.push(response.id)
        }
    })
    if (added.length + modified.length + removed.length === 0) {
        return
    }
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: ":slackbot: Slackbot autoresponse update!",
                emoji: true,
            },
        },
        {
            type: "divider",
        },
    ]
    added.forEach((newResponseId) => {
        const newResponse = newResponses.find((x) => x.id == newResponseId)
        blocks.push(
            {
                type: "rich_text",
                elements: [
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "emoji",
                                name: "plus-icon",
                            },
                            {
                                type: "text",
                                text: " New response added!",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "text",
                                text: "Triggers:",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_list",
                        style: "bullet",
                        indent: 0,
                        elements: newResponse.triggers.map((trigger) => ({
                            type: "rich_text_section",
                            elements: [{ type: "text", text: trigger }],
                        })),
                    },
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "text",
                                text: "Responses:",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_list",
                        style: "bullet",
                        indent: 0,
                        elements: newResponse.responses.map((response) => ({
                            type: "rich_text_section",
                            elements: [{ type: "text", text: response }],
                        })),
                    },
                ],
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "Added by <@" + newResponse.creator + ">",
                    },
                ],
            },
            { type: "divider" },
        )
    })
    modified.forEach((modifiedResponseId) => {
        const newResponse = newResponses.find((x) => x.id == modifiedResponseId)
        const oldResponse = prevResponses.find(
            (x) => x.id == modifiedResponseId,
        )
        blocks.push(
            {
                type: "rich_text",
                elements: [
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "emoji",
                                name: "plus-icon-purple",
                            },
                            {
                                type: "emoji",
                                name: "minus-icon-purple",
                            },
                            {
                                type: "text",
                                text: " Response modified!",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "text",
                                text: "Triggers:",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_list",
                        style: "bullet",
                        indent: 0,
                        elements: [
                            ...newResponse.triggers.map((trigger) => ({
                                type: "rich_text_section",
                                elements: [
                                    ...(oldResponse.triggers.includes(trigger)
                                        ? []
                                        : [
                                              {
                                                  type: "emoji",
                                                  name: "plus-icon",
                                              },
                                          ]),
                                    {
                                        type: "text",
                                        text:
                                            (oldResponse.triggers.includes(
                                                trigger,
                                            )
                                                ? ""
                                                : " ") + trigger,
                                    },
                                ],
                            })),
                            ...oldResponse.triggers
                                .map((trigger) =>
                                    newResponse.triggers.includes(trigger)
                                        ? null
                                        : {
                                              type: "rich_text_section",
                                              elements: [
                                                  {
                                                      type: "emoji",
                                                      name: "minus-icon",
                                                  },
                                                  {
                                                      type: "text",
                                                      text: " " + trigger,
                                                  },
                                              ],
                                          },
                                )
                                .filter((x) => x !== null),
                        ],
                    },
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "text",
                                text: "Responses:",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_list",
                        style: "bullet",
                        elements: [
                            ...newResponse.responses.map((response) => ({
                                type: "rich_text_section",
                                elements: [
                                    ...(oldResponse.responses.includes(response)
                                        ? []
                                        : [
                                              {
                                                  type: "emoji",
                                                  name: "plus-icon",
                                              },
                                          ]),
                                    {
                                        type: "text",
                                        text:
                                            (oldResponse.responses.includes(
                                                response,
                                            )
                                                ? ""
                                                : " ") + response,
                                    },
                                ],
                            })),
                            ...oldResponse.responses
                                .map((response) =>
                                    newResponse.responses.includes(response)
                                        ? null
                                        : {
                                              type: "rich_text_section",
                                              elements: [
                                                  {
                                                      type: "emoji",
                                                      name: "minus-icon",
                                                  },
                                                  {
                                                      type: "text",
                                                      text: " " + response,
                                                  },
                                              ],
                                          },
                                )
                                .filter((x) => x !== null),
                        ],
                        indent: 0,
                    },
                ],
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "Edited by <@" + newResponse.editor + ">",
                    },
                ],
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text:
                            "Originally added by <@" +
                            newResponse.creator +
                            ">",
                    },
                ],
            },
            { type: "divider" },
        )
    })
    removed.forEach((oldResponseId) => {
        const oldResponse = prevResponses.find((x) => x.id == oldResponseId)
        blocks.push(
            {
                type: "rich_text",
                elements: [
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "emoji",
                                name: "minus-icon",
                            },
                            {
                                type: "text",
                                text: " Response removed",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "text",
                                text: "Triggers:",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_list",
                        style: "bullet",
                        indent: 0,
                        elements: oldResponse.triggers.map((trigger) => ({
                            type: "rich_text_section",
                            elements: [{ type: "text", text: trigger }],
                        })),
                    },
                    {
                        type: "rich_text_section",
                        elements: [
                            {
                                type: "text",
                                text: "Responses:",
                                style: {
                                    bold: true,
                                },
                            },
                        ],
                    },
                    {
                        type: "rich_text_list",
                        style: "bullet",
                        indent: 0,
                        elements: oldResponse.responses.map((response) => ({
                            type: "rich_text_section",
                            elements: [{ type: "text", text: response }],
                        })),
                    },
                ],
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text:
                            "Originally added by <@" +
                            oldResponse.creator +
                            ">",
                    },
                ],
            },
            ...("editor" in oldResponse
                ? [
                      {
                          type: "context",
                          elements: [
                              {
                                  type: "mrkdwn",
                                  text:
                                      "Last edited by <@" +
                                      oldResponse.editor +
                                      ">",
                              },
                          ],
                      },
                  ]
                : []),
            { type: "divider" },
        )
    })
    blocks.push({
        type: "context",
        elements: [
            {
                type: "mrkdwn",
                text: "Ping pong <!channel>",
            },
        ],
    })
    console.log(blocks)
    await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
            authorization: "Bearer " + Deno.env.get("SLACK_XOXB"),
            "content-type": "application/json",
        },
        body: JSON.stringify({
            channel: "C0B4B61B25C",
            text: `${added.length ? `${added.length} added, ` : ""}${modified.length ? `${modified.length} modified, ` : ""}${removed.length ? `${removed.length} removed` : ""}`,
            blocks,
        }),
    })
    await Deno.writeTextFile("./responses.json", JSON.stringify(newResponses))
    prevResponses = newResponses
}
await check()
setInterval(check, 1000 * 60 * 2)
