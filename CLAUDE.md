# CLAUDE.md - Admin App Coding Reference

## Build/Lint/Test Commands
- **Development**: `npm start` - Start development server
- **Build**: `npm run build` - Build for production
- **Test**: `npm run test` - Run all tests
- **Single Test**: `npm test -- -t "test name"` - Run specific test
- **Deploy**: `npm run deploy` - Deploy to GitHub Pages

## Code Style Guidelines
- **Imports**: React first, external libraries second, local modules last
- **Formatting**: Single quotes, semicolons required, 2-space indent
- **Types**: Use TypeScript interfaces with explicit property types
- **Naming**: PascalCase for components/interfaces, camelCase for functions/variables
- **Components**: Functional components with React hooks
- **Error Handling**: Try/catch for async operations with user-friendly messages
- **State Management**: React hooks for state (useState, useEffect, useCallback)

## Project Structure
- Components organized by feature in `/components`
- Custom hooks in `/hooks` directory
- Type definitions centralized in `/types`
- Firebase configuration in `/firebase`
- Utilities in `/utils`

When developing, match existing code style and use Tailwind CSS for styling.