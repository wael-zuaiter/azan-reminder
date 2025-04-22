# Contributing to Azan Reminder Bot

Thank you for your interest in contributing to the Azan Reminder Bot! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and considerate of others.

## How to Contribute

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Make your changes
4. Test your changes thoroughly
5. Submit a pull request

## Development Setup

1. Clone your forked repository:
   ```bash
   git clone https://github.com/yourusername/azan-reminder-bot.git
   cd azan-reminder-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Set up the database:
   ```bash
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm start
   ```

## Pull Request Process

1. Ensure your code follows the project's coding style
2. Update the README.md if necessary
3. Add tests for new features or bugfixes
4. Ensure all tests pass
5. Update the documentation if needed
6. Submit your pull request with a clear description of the changes

## Coding Standards

- Use ES6+ JavaScript features
- Follow the existing code style
- Write clear and concise commit messages
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable and function names

## Testing

Please ensure that your changes are properly tested. The project uses the following testing tools:

- Jest for unit tests
- Supertest for API tests

To run tests:
```bash
npm test
```

## Documentation

- Keep the README.md up to date
- Document new features in the appropriate sections
- Add comments to complex code sections
- Update the API documentation if needed

## Reporting Bugs

If you find a bug, please create an issue with the following information:

1. A clear description of the bug
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Environment details (OS, Node.js version, etc.)

## Feature Requests

If you have a feature request, please create an issue with:

1. A clear description of the feature
2. Why this feature would be useful
3. Any potential implementation ideas

## Questions?

If you have any questions about contributing, please open an issue or contact the maintainers.

Thank you for contributing to Azan Reminder Bot! 