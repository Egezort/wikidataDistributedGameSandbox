# Team Validation Game

This is a simple PHP-based API implementation for integrating with the Wikidata Game platform.

## Features
- Provides a game description (`action=desc`).
- Supplies game tiles (`action=tiles`).
- Logs user actions (`action=log_action`).

## How to Use
1. Upload this project to your web server or GitHub repository.
2. Access `index.html` to test the API.

## API Endpoints
### 1. Game Description
- URL: `api.php?action=desc&callback=test`
- Returns a description of the game.

### 2. Fetch Game Tiles
- URL: `api.php?action=tiles&num=1&lang=en&callback=test`
- Returns game tiles to play.

### 3. Log User Actions
- URL: `api.php?action=log_action&user=TestUser&tile=1&decision=yes`
- Logs user actions for game tracking.

## Deployment
This project can be hosted on any PHP-compatible server. No additional dependencies are required.