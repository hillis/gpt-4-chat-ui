GPT Chat UI

This project is a simple React-based chat interface that uses Next.js and communicates with OpenAI's GPT-4 (or GPT-3.5-turbo) language model to generate responses.

Features

Responsive chat interface
Auto-scroll to the latest message
Message input validation
OpenAI GPT-4 integration
Loading indicator during API requests
Getting Started

These instructions will help you set up the project on your local machine.

Prerequisites
Node.js >= 14.x
Yarn or npm (Yarn is recommended)
Installation
Clone the repository:
bash
Copy code
git clone https://github.com/your-username/gpt-4-chat-ui.git
Change to the project directory:
bash
Copy code
cd gpt-4-chat-ui
Install dependencies:
bash
Copy code
yarn
or

bash
Copy code
npm install
Add your OpenAI API key to a .env.local file:
env
Copy code
OPENAI_API_KEY=your_openai_api_key_here
Make sure to replace your_openai_api_key_here with your actual OpenAI API key.

Run the development server:
bash
Copy code
yarn dev
or

bash
Copy code
npm run dev
Now you can open your browser and navigate to http://localhost:3000 to see the chat interface in action.

Deployment

To deploy the application, follow the Next.js deployment documentation.

Built With

Next.js - The React framework used
TypeScript - The programming language used
OpenAI API - The AI language model used
Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

License

This project is licensed under the MIT License - see the LICENSE.md file for details.