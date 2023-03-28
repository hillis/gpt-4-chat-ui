// Make sure to add OPENAI_API_KEY as a secret

import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum,} from "openai";
import type { NextApiRequest, NextApiResponse } from "next";


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function chatHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const completion = await openai.createChatCompletion({
    // Downgraded to GPT-3.5 due to high traffic. Sorry for the inconvenience.
    // If you have access to GPT-4, simply change the model to "gpt-4"
    model: "gpt-4",
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: "You are a helpful assistant.",
      },
      
    ].concat(req.body.messages),
    temperature: 0,
  });
  res.status(200).json({ result: completion.data.choices[0].message });
}

export default chatHandler;
