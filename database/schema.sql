CREATE TABLE Roles (
    role_id INT PRIMARY KEY, 
    role_name NVARCHAR(20) NOT NULL CHECK (role_name IN ('student', 'club_manager', 'admin'))
);

INSERT INTO Roles (role_id, role_name) VALUES (1, 'student'), (2, 'club_manager'), (3, 'admin');

CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    role_id INT NOT NULL DEFAULT 1,
    full_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_User_Role FOREIGN KEY (role_id) REFERENCES Roles(role_id)
);

CREATE TABLE Clubs (
    club_id INT PRIMARY KEY IDENTITY(1,1),
    club_name NVARCHAR(150) NOT NULL UNIQUE,
    category NVARCHAR(50),
    description NVARCHAR(MAX),
    max_quota INT DEFAULT 100,
    max_managers INT DEFAULT 3
);

-- Handles requests from users to become club representatives (Admin Approval required)
CREATE TABLE Club_Managers (
    manager_id INT PRIMARY KEY IDENTITY(1,1),
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    request_status INT DEFAULT 0, -- 0: Pending, 1: Approved, 2: Rejected
    request_date DATETIME DEFAULT GETDATE(),
    application_message NVARCHAR(MAX),
    CONSTRAINT FK_Mgr_Club FOREIGN KEY (club_id) REFERENCES Clubs(club_id) ON DELETE CASCADE,
    CONSTRAINT FK_Mgr_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT CHK_MgrStatus CHECK (request_status IN (0, 1, 2)),
    UNIQUE(club_id, user_id)
);

-- Members of clubs (auto-joined if quota available)
CREATE TABLE Club_Members (
    membership_id INT PRIMARY KEY IDENTITY(1,1),
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Mem_Club FOREIGN KEY (club_id) REFERENCES Clubs(club_id) ON DELETE CASCADE,
    CONSTRAINT FK_Mem_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE(club_id, user_id)
);

-- Managed by Club Managers, validated by Admins
CREATE TABLE Events (
    event_id INT PRIMARY KEY IDENTITY(1,1),
    club_id INT NOT NULL,
    creator_id INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX),
    event_date DATETIME NOT NULL,
    event_end_date DATETIME,
    category NVARCHAR(50),
    location NVARCHAR(255),
    is_members_only BIT DEFAULT 0, -- 0: Public, 1: Members Only
    -- Approval by Admin:
    approval_status INT DEFAULT 0, -- 0: Pending, 1: Approved, 2: Rejected
    event_state NVARCHAR(20) DEFAULT 'Upcoming',
    max_attendees INT DEFAULT 100,
    CONSTRAINT FK_Evnt_Club FOREIGN KEY (club_id) REFERENCES Clubs(club_id) ON DELETE CASCADE,
    CONSTRAINT FK_Evnt_Creator FOREIGN KEY (creator_id) REFERENCES Users(user_id),
    CONSTRAINT CHK_Evnt_Appr CHECK (approval_status IN (0, 1, 2)),
    CONSTRAINT CHK_Evnt_State CHECK (event_state IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled'))
);

-- Logic: Auto-approved registration if quota available (Members only check is enforced in backend)
CREATE TABLE Event_Registrations (
    registration_id INT PRIMARY KEY IDENTITY(1,1),
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registered_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Reg_Evnt FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    CONSTRAINT FK_Reg_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION,
    UNIQUE(event_id, user_id)
);