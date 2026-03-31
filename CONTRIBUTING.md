# Contributing to mc-qq-bridge

Thank you for your interest! This document provides guidelines for contributing.

## Code Style

- Use consistent indentation (2 spaces)
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable/function names

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes (see Testing section)
5. Commit with clear, descriptive messages
6. Push to your fork
7. Open a Pull Request with description of changes

## Development Setup

```bash
git clone https://github.com/yourusername/mc-qq-bridge.git
cd mc-qq-bridge
npm install
```

## Testing

We don't have automated tests yet, but please test manually:

1. Start the bridge with test config
2. Verify MC → QQ message flow
3. Verify QQ → MC message flow (if applicable)
4. Check logs for errors

## Configuration Changes

If you modify configuration schema:
- Update `config/config.example.json`
- Update README.md if needed
- Document backward compatibility considerations

## Issues

When filing an issue, please include:

- Version (commit hash or release tag)
- OS and Node.js version
- Docker/Minecraft/LLBot versions
- Logs (relevant excerpts)
- Steps to reproduce

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
