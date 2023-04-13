import axios, { AxiosResponse } from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

async function chatHandler(req: NextApiRequest, res: NextApiResponse) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };

  const data = {
    model: "gpt-4",
    stream: true,
    messages: [
      {
        role: "system",
        content: "You are a funny sarcastic assistant.",
      },
    ].concat(req.body.messages),
    temperature: 0.9,
  };

  try {
    const response: AxiosResponse<any> = await axios.post(
      "https://api.openai.com/v1/engines/davinci-codex/completions",
      data,
      {
        headers: headers,
        responseType: "stream",
      }
    );

    response.data.on("data", (chunk: Buffer) => {
      res.write(chunk);
    });

    response.data.on("end", () => {
      res.status(200).end();
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export default chatHandler;
