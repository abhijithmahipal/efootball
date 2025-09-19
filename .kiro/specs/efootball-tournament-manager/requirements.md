# Requirements Document

## Introduction

The eFootball Tournament Manager is a web application built with Angular 19 and Firebase/Firestore that enables tournament organizers to manage league-style tournaments with their friends. The system supports round-robin league play followed by playoffs, with comprehensive match scheduling, score tracking, and points table management. The application provides separate interfaces for administrators (who manage tournaments) and regular users (who view schedules and standings).

## Requirements

### Requirement 1

**User Story:** As a tournament administrator, I want to create and manage player rosters, so that I can organize tournaments with the correct participants.

#### Acceptance Criteria

1. WHEN an admin accesses the admin panel THEN the system SHALL provide a player management interface
2. WHEN an admin adds a new player THEN the system SHALL require a player name as mandatory information
3. WHEN an admin attempts to generate a tournament schedule THEN the system SHALL require a minimum of 5 players
4. WHEN a player is added to the roster THEN the system SHALL store the player information in Firestore
5. IF fewer than 5 players are registered THEN the system SHALL prevent tournament schedule generation

### Requirement 2

**User Story:** As a tournament administrator, I want the system to automatically generate match schedules, so that every player plays against every other player in home and away matches.

#### Acceptance Criteria

1. WHEN an admin initiates schedule generation THEN the system SHALL create a round-robin tournament where each player plays every other player twice (home and away)
2. WHEN the schedule is generated THEN the system SHALL organize matches into matchdays for better organization
3. WHEN matches are scheduled THEN the system SHALL store match information including home player, away player, and matchday in Firestore
4. WHEN the league phase is complete THEN the system SHALL automatically identify the top 4 players for playoffs based on points

### Requirement 3

**User Story:** As a tournament administrator, I want to enter match results and have the points table update automatically, so that standings are always current and accurate.

#### Acceptance Criteria

1. WHEN an admin enters a match result THEN the system SHALL update the match record with home goals and away goals
2. WHEN a match result is entered THEN the system SHALL automatically calculate points (3 for win, 1 for draw, 0 for loss)
3. WHEN match results are updated THEN the system SHALL recalculate all relevant statistics: matches played, wins, losses, draws, goals for, goals against, goal difference, and total points
4. WHEN the points table is updated THEN the system SHALL automatically sort players by total points (with goal difference as tiebreaker)
5. WHEN all league matches are completed THEN the system SHALL determine playoff participants (top 4 players)

### Requirement 4

**User Story:** As a tournament administrator, I want to manage playoff matches with the correct bracket system, so that the tournament concludes with proper semifinals and finals.

#### Acceptance Criteria

1. WHEN the league phase ends THEN the system SHALL create playoff matches: 1st vs 4th and 2nd vs 3rd in semifinals
2. WHEN semifinal results are entered THEN the system SHALL create a final match between the two winners
3. WHEN semifinal results are entered THEN the system SHALL create a third-place playoff between the two losers
4. WHEN playoff matches are created THEN the system SHALL store them separately from league matches in Firestore

### Requirement 5

**User Story:** As a regular user, I want to view match schedules organized by matchdays, so that I can see when matches are scheduled and track tournament progress.

#### Acceptance Criteria

1. WHEN a user accesses the schedule page THEN the system SHALL display matches organized by matchdays
2. WHEN viewing the schedule THEN the system SHALL show home player, away player, and match status for each match
3. WHEN a match has been played THEN the system SHALL display the final score
4. WHEN a match has not been played THEN the system SHALL show it as pending
5. WHEN playoff matches exist THEN the system SHALL display them in a separate playoff section

### Requirement 6

**User Story:** As a regular user, I want to view a comprehensive points table, so that I can track player standings and performance throughout the tournament.

#### Acceptance Criteria

1. WHEN a user accesses the points table page THEN the system SHALL display all players with their statistics
2. WHEN displaying the points table THEN the system SHALL show: player name, matches played, wins, losses, draws, goals for, goals against, goal difference, and total points
3. WHEN the points table is displayed THEN the system SHALL sort players by total points in descending order
4. IF players have equal points THEN the system SHALL use goal difference as the primary tiebreaker
5. WHEN the points table updates THEN the system SHALL reflect changes in real-time

### Requirement 7

**User Story:** As a tournament administrator, I want secure access to administrative functions through a dedicated admin route, so that only authorized users can manage tournament data.

#### Acceptance Criteria

1. WHEN accessing the /admin route THEN the system SHALL provide administrative login functionality
2. WHEN an admin logs in successfully THEN the system SHALL provide access to player management, schedule generation, and score entry functions
3. WHEN an unauthorized user attempts admin access THEN the system SHALL deny access to administrative functions
4. WHEN admin functions are accessed THEN the system SHALL use Firebase Authentication for security

### Requirement 8

**User Story:** As a user of the application, I want the system to be built with modern web technologies and reliable data storage, so that the application is performant and data is persistent.

#### Acceptance Criteria

1. WHEN the application is built THEN the system SHALL use Angular 19 as the frontend framework
2. WHEN data needs to be stored THEN the system SHALL use Firebase Firestore as the backend database
3. WHEN users interact with the application THEN the system SHALL provide responsive design for different screen sizes
4. WHEN data is modified THEN the system SHALL ensure real-time synchronization across all connected clients
5. WHEN the application loads THEN the system SHALL provide appropriate loading states and error handling
