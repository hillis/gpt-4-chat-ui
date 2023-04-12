# **GPT 4 Chat UI**

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
- npm

### **Dependencies**

- **`@emotion/react`**: ^11.10.6
- **`@emotion/styled`**: ^11.10.6
- **`@mui/material`**: ^5.11.14
- **`@types/node`**: 18.15.10
- **`@types/react`**: 18.0.29
- **`@types/react-dom`**: 18.0.11
- **`eslint`**: 8.36.0
- **`eslint-config-next`**: 13.2.4
- **`next`**: 13.2.4
- **`openai`**: ^3.2.1
- **`react`**: 18.2.0
- **`react-dom`**: 18.2.0
- **`react-markdown`**: ^8.0.6
- **`typescript`**: 5.0.2

### **Installation**

1. Clone the repository:

```

git clone https://github.com/hillis/gpt-4-chat-ui.git

```

1. Change to the project directory:

```

cd gpt-4-chat-ui

```

1. Install dependencies:


```

npm install

```

1. Add your OpenAI API key to a **`.env`** file:

```
envCopy code
OPENAI_API_KEY=your_openai_api_key_here

```

Make sure to replace **`your_openai_api_key_here`** with your actual OpenAI API key.

1. Run the development server:


```

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
Used Template and converted to Typescript
Frontend of this repo is inspired by langchain-chat-nextjs **[LangChain-Chat-NextJS](https://github.com/zahidkhawaja/langchain-chat-nextjs)**



## **License**

This project is licensed under the MIT License - 
