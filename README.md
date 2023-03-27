# **GPT Chat UI**

This project is a simple React-based chat interface that uses Next.js and communicates with OpenAI's GPT-4 (or GPT-3.5-turbo) language model to generate responses.

## **Features**

- Responsive chat interface
- Auto-scroll to the latest message
- Message input validation
- OpenAI GPT-4 integration
- Loading indicator during API requests

## **Getting Started**

These instructions will help you set up the project on your local machine.

### **Prerequisites**

- Node.js >= 14.x
- Yarn or npm (Yarn is recommended)

### **Installation**

1. Clone the repository:

```
bashCopy code
git clone https://github.com/your-username/gpt-4-chat-ui.git

```

1. Change to the project directory:

```
bashCopy code
cd gpt-4-chat-ui

```

1. Install dependencies:

```
bashCopy code
yarn

```

*or*

```
bashCopy code
npm install

```

1. Add your OpenAI API key to a **`.env.local`** file:

```
envCopy code
OPENAI_API_KEY=your_openai_api_key_here

```

Make sure to replace **`your_openai_api_key_here`** with your actual OpenAI API key.

1. Run the development server:

```
bashCopy code
yarn dev

```

*or*

```
bashCopy code
npm run dev

```

Now you can open your browser and navigate to **`http://localhost:3000`** to see the chat interface in action.

## **Deployment**

To deploy the application, follow the **[Next.js deployment documentation](https://nextjs.org/docs/deployment)**.

## **Built With**

- **[Next.js](https://nextjs.org/)** - The React framework used
- **[TypeScript](https://www.typescriptlang.org/)** - The programming language used
- **[OpenAI API](https://beta.openai.com/docs/)** - The AI language model used

## **Contributing**

Please read **[CONTRIBUTING.md](https://chat.openai.com/CONTRIBUTING.md)** for details on our code of conduct and the process for submitting pull requests.

## **License**

This project is licensed under the MIT License - see the **[LICENSE.md](https://chat.openai.com/LICENSE.md)** file for details.