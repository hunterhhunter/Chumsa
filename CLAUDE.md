# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin called "Chumsa" that implements semantic search and embedding functionality for markdown notes. The plugin generates embeddings for markdown content using OpenAI's text-embedding models and provides visual indicators (link icons) next to headings in the reading view.

## Core Architecture

The plugin follows a modular architecture with three main components:

1. **Main Plugin (`src/main.ts`)** - Core plugin class that handles UI integration, settings, and orchestrates embedding operations
2. **Embedding Generator (`src/generateEmbeddingsForMarkdown.ts`)** - Processes markdown files into semantic blocks and generates embeddings
3. **Data Structures (`src/structures.ts`)** - Type definitions for embedding data

### Key Dependencies

The plugin relies heavily on the `jsbrains` ecosystem of smart-* packages:
- `smart-embed-model` - Embedding model abstraction with OpenAI adapter
- `smart-blocks` - Markdown block parsing functionality
- Multiple other smart-* packages for various utilities

## Development Commands

```bash
# Development with hot reload
npm run dev

# Production build with type checking
npm run build

# Run tests
npm run test

# Run benchmarks  
npm run bench

# Version bump (updates manifest.json and versions.json)
npm run version
```

## Key Features

- **Automatic Embedding Generation**: Scans all markdown files in the vault and generates embeddings for content blocks
- **Visual Indicators**: Adds clickable link icons next to headings in reading view
- **Command Integration**: Provides "Re-index all notes" command for manual re-indexing
- **Persistent Storage**: Saves embeddings to `embeddings.json` in the plugin directory

## File Structure

- `src/main.ts` - Main plugin class with UI integration and embedding orchestration
- `src/generateEmbeddingsForMarkdown.ts` - Core embedding generation logic
- `src/structures.ts` - TypeScript interfaces for embedding data
- `manifest.json` - Plugin metadata
- `esbuild.config.mjs` - Build configuration

## Important Implementation Details

### Environment Setup
- Requires `OPENAI_API_KEY` environment variable for embedding model
- Uses `text-embedding-3-small` model by default

### Data Flow
1. Plugin scans vault for markdown files
2. Each file is parsed into semantic blocks using `smart-blocks`
3. Blocks are embedded using OpenAI's embedding model
4. Results stored as `EmbededData[]` in `embeddings.json`

### UI Integration
- Uses `registerMarkdownPostProcessor` to inject link icons into headings
- Icons are added with CSS class `chumsa-icon` for styling
- Click handlers are attached for future semantic search functionality

## Local Development Setup

This plugin depends on local file dependencies from the `jsbrains` ecosystem. Ensure parent directories contain:
- `../jsbrains/` - Core smart packages
- `../obsidian-smart-env/` - Environment utilities  
- `../smart-*` - Additional smart package dependencies

For new installations:
1. Clone repository into `.obsidian/plugins/chumsa/`
2. Run `npm install`
3. Set up `OPENAI_API_KEY` environment variable
4. Run `npm run dev` for development builds

always response korean