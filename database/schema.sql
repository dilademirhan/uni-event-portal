CREATE TABLE Roles (
    role_id INT PRIMARY KEY,
    role_name VARCHAR(20) NOT NULL CHECK (role_name IN ('student', 'club_manager', 'admin'))
);

INSERT INTO Roles (role_id, role_name) VALUES (1, 'student'), (2, 'club_manager'), (3, 'admin');

CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    role_id INT NOT NULL DEFAULT 1,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT FK_User_Role FOREIGN KEY (role_id) REFERENCES Roles(role_id) 
    ON DELETE NO ACTION -- Roles are static, we don't want to delete them
);

CREATE TABLE Clubs (
    club_id INT PRIMARY KEY IDENTITY(1,1),
    club_name VARCHAR(150) NOT NULL,
    category VARCHAR(50)
);

CREATE TABLE Events (
    event_id INT PRIMARY KEY IDENTITY(1,1),
    club_id INT NOT NULL,
    creator_id INT NOT NULL,
    event_title VARCHAR(200) NOT NULL,
    description VARCHAR(MAX),
    event_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    CONSTRAINT FK_Event_Club FOREIGN KEY (club_id) REFERENCES Clubs(club_id) 
    ON DELETE CASCADE, 
    CONSTRAINT FK_Event_Creator FOREIGN KEY (creator_id) REFERENCES Users(user_id),
    CONSTRAINT CHK_Event_Status CHECK (status IN ('active', 'cancelled', 'completed'))
);

CREATE TABLE Applications (
    app_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    applied_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_App_User FOREIGN KEY (user_id) REFERENCES Users(user_id) 
    ON DELETE CASCADE, 
    CONSTRAINT FK_App_Event FOREIGN KEY (event_id) REFERENCES Events(event_id) 
    ON DELETE NO ACTION, 
    CONSTRAINT CHK_App_Status CHECK (status IN ('pending', 'approved', 'rejected'))
);