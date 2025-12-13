# 👋 START HERE - Effect Chat UI

Welcome! You've successfully created a production-ready chat UI using Effect.js.

## ⚡ 30-Second Overview

This is a React chat application that:

- Replicates [assistant-ui.com](https://assistant-ui.com/) architecture
- Uses **Effect.js** for type-safe state management
- Integrates with **McLuhan packages** (effect-ai-sdk, effect-actor, effect-supermemory)
- Supports **7+ AI providers** (OpenAI, Anthropic, Google Gemini, etc.)
- Includes **Hume AI** integration for voice/emotion
- **Builds to 199 kB** (gzipped)
- **Fully documented** with 6 comprehensive guides

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
# From the McLuhan monorepo root
bun install
```

### 2. Configure API Key

```bash
cd apps/chat
echo 'VITE_OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE' > .env.local
```

Get an API key:

- **OpenAI:** <https://platform.openai.com/api-keys>
- **Anthropic:** <https://console.anthropic.com/>
- **Google:** <https://makersuite.google.com/app/apikey>

### 3. Start Development

```bash
bun run dev
```

Opens at **<http://localhost:5173>**. Type a message and chat!

### 4. Build for Production

```bash
bun run build
```

Creates `dist/` folder ready to deploy.

## 📚 Documentation Path

Choose your path based on what you need:

### 🎯 I just want to use it

**→ Read:** [QUICKSTART.md](./QUICKSTART.md) (5 minutes)

Skip to "Running" section, run `bun run dev`, and you're done.

### 🔧 I want to understand the code

**→ Read:** [SETUP.md](./SETUP.md) (20 minutes)

Complete setup guide with code examples, debugging tips, and customization options.

### 🏗️ I want to understand the architecture

**→ Read:** [ARCHITECTURE.md](./ARCHITECTURE.md) (30 minutes)

Deep dive into design patterns, Effect.js integration, and how everything works together.

### 📖 I want to see all files explained

**→ Read:** [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) (15 minutes)

File-by-file breakdown with line counts and purposes.

### 🎓 I want to see the complete index

**→ Read:** [00_PROJECT_INDEX.md](./00_PROJECT_INDEX.md) (15 minutes)

Full project structure, metrics, and learning resources.

### 🎉 I want the completion summary

**→ Read:** [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) (10 minutes)

High-level overview of what was built and next steps.

### 📋 I want feature details

**→ Read:** [README.md](./README.md) (10 minutes)

Feature overview and core concepts.

## 🎯 Recommended Reading Order

**If you're in a hurry:**

1. This file (you're reading it!)
2. [QUICKSTART.md](./QUICKSTART.md) - Get it running
3. Done!

**If you have 30 minutes:**

1. This file
2. [QUICKSTART.md](./QUICKSTART.md) - Get running
3. [SETUP.md](./SETUP.md) - Understand customization
4. Done! Start building features

**If you have 1 hour:**

1. This file
2. [QUICKSTART.md](./QUICKSTART.md)
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive
4. Run `bun run dev` and explore the code
5. Read [SETUP.md](./SETUP.md) for extending

**If you want to understand everything:**

1. This file
2. [00_PROJECT_INDEX.md](./00_PROJECT_INDEX.md) - Project map
3. [SETUP.md](./SETUP.md) - Detailed setup
4. [ARCHITECTURE.md](./ARCHITECTURE.md) - Design patterns
5. [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - File breakdown
6. Explore `src/` code (it's well-commented)

## 🔍 Quick Navigation

### By Topic

### Getting Started

- [QUICKSTART.md](./QUICKSTART.md) - 5-minute setup
- [SETUP.md](./SETUP.md) - Complete guide

#### Architecture & Design

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Design patterns
- [00_PROJECT_INDEX.md](./00_PROJECT_INDEX.md) - Project structure

#### Reference

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - File breakdown
- [README.md](./README.md) - Features
- [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) - Project summary

### By Question

**"How do I run it?"**
→ [QUICKSTART.md](./QUICKSTART.md)

**"What files do what?"**
→ [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

**"How do I add a feature?"**
→ [SETUP.md](./SETUP.md) → "Adding a Feature" section

**"How does Effect.js integration work?"**
→ [ARCHITECTURE.md](./ARCHITECTURE.md)

**"How do I deploy?"**
→ [SETUP.md](./SETUP.md) → "Deployment" section

**"What's the complete project structure?"**
→ [00_PROJECT_INDEX.md](./00_PROJECT_INDEX.md)

## 📊 What You've Built

### Core Features

- ✅ Chat message UI (Thread + Message + Composer)
- ✅ AI streaming integration (OpenAI, Anthropic, Google, etc.)
- ✅ Effect-based state management (ThreadActor pattern)
- ✅ React context integration
- ✅ Markdown rendering
- ✅ Auto-scroll + manual scroll
- ✅ Error handling
- ✅ Loading states
- ✅ Persistence abstraction (localStorage + effect-supermemory ready)
- ✅ Hume voice/emotion ready
- ✅ Responsive design
- ✅ Hot module reloading
- ✅ Production build (199 kB gzipped)

### Architecture

- **Effect-native:** All state management uses Effect.js Context Tags
- **State machine:** ThreadActor implements pure state transitions
- **Composable:** Easy to extend and test
- **Type-safe:** 100% TypeScript with strict mode
- **Separated:** Actors, Services, Components, Context

### Integration

- **effect-ai-sdk** - AI integration (7+ providers)
- **effect-actor** - State machine primitives
- **effect-supermemory** - Persistence layer (ready to integrate)
- **Hume SDK** - Voice/emotion (ready to integrate)
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling

## 💡 Key Concepts (30 seconds)

**ThreadActor** = State machine for conversation

```typescript
(state, message) => Effect<newState>
```

**ThreadService** = Wraps actor in Effect context

```typescript
class ThreadService extends Context.Tag<ThreadService>() { ... }
```

**ChatRuntime** = Bridge to effect-ai-sdk

```typescript
streamResponse(messages) → AsyncIterable<string>
```

**ChatProvider** = React context + service initialization

```typescript
const { messages, sendMessage } = useChatContext()
```

## 🚀 Next Steps

### Immediate (Now)

1. ✅ Run `bun run dev`
2. ✅ Chat with an AI
3. ✅ Try switching providers

### Short Term (This week)

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the design
2. Add a custom feature (see [SETUP.md](./SETUP.md) example)
3. Deploy to Vercel/Netlify

### Medium Term (This month)

1. Integrate effect-supermemory for persistent chat history
2. Enable Hume voice integration
3. Add slash commands (reference: effect-cli-tui)
4. Add user authentication

### Long Term (This quarter)

1. Build mobile version (React Native)
2. Add multi-user support
3. Implement emotion-aware responses
4. Create admin dashboard

## 📝 Commands You'll Use

```bash
bun run dev              # Start dev server (http://localhost:5173)
bun run build            # Production build
bun run preview          # Preview built version
bun run typecheck        # Type check
bun run lint             # Linting
bun run format:fix       # Auto-format
```

## 🆘 Troubleshooting

### "Module not found"

```bash
bun install
```

**"API key not working"**
Check `.env.local` has correct format: `VITE_OPENAI_API_KEY=sk-...`

### "Port 5173 already in use"

```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9
bun run dev
```

### "Build fails"

```bash
rm -rf dist/ node_modules/
bun install
bun run build
```

## 📖 Learning Resources

### Effect.js

- Website: <https://effect.website/>
- Docs: <https://effect.website/docs/overview>
- GitHub: <https://github.com/Effect-TS/effect>

### assistant-ui (Inspiration)

- Website: <https://assistant-ui.com/>
- GitHub: <https://github.com/useassistant/assistant-ui>

### McLuhan Packages

- effect-ai-sdk: `packages/effect-ai-sdk/README.md`
- effect-actor: `packages/effect-actor/README.md`
- effect-supermemory: `packages/effect-supermemory/README.md`

### Hume

- Website: <https://hume.ai/>
- Docs: <https://docs.hume.ai/>

## ✨ Summary

You now have:

- ✅ A working chat UI at `http://localhost:5173`
- ✅ Production build ready at `dist/`
- ✅ Full Effect.js state management
- ✅ 7+ AI provider support
- ✅ Complete documentation
- ✅ Everything to build advanced features

### Next: Pick a Documentation File

Based on what you want to do:

- **Just run it:** [QUICKSTART.md](./QUICKSTART.md)
- **Understand it:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Extend it:** [SETUP.md](./SETUP.md)
- **Reference it:** [00_PROJECT_INDEX.md](./00_PROJECT_INDEX.md)

---

**Happy coding!** 🚀

Questions? Check the relevant documentation file—all answers are there.
