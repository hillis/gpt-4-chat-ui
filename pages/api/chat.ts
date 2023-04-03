// Make sure to add OPENAI_API_KEY as a secret

// import { Configuration, OpenAIApi,ChatCompletionRequestMessageRoleEnum,} from "openai";
import { Configuration, OpenAI,ChatCompletionRequestMessageRoleEnum,} from "langchain";
import type { NextApiRequest, NextApiResponse } from "next";
// import { ChatPromptTemplate, HumanPromptTemplate, PromptTemplate, SystemMessagePromptTemplate,  } from "langchain/prompts";


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const SystemMessagePromptTemplate = (message: string) => `System: ${message}

async function chatHandler(
  req: NextApiRequest,
  res: NextApiResponse
)
{
  const completion = await openai.createChatCompletion({
  
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
