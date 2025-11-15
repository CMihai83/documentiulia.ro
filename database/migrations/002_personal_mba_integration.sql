-- ====================================================================
-- PERSONAL MBA KNOWLEDGE BASE INTEGRATION
-- ====================================================================
-- Purpose: Integrate 99 Personal MBA books + frameworks into platform
-- Date: 2025-11-15
-- ====================================================================

-- ====================================================================
-- 1. PERSONAL MBA BOOKS LIBRARY
-- ====================================================================

CREATE TABLE IF NOT EXISTS mba_books (
    id SERIAL PRIMARY KEY,
    book_number INTEGER UNIQUE NOT NULL, -- 1-99 from Personal MBA list
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300) NOT NULL,
    category VARCHAR(100), -- Business Creation, Marketing, Finance, etc.
    core_concept TEXT, -- One-sentence what it teaches
    key_frameworks JSONB, -- Array of framework names from book
    summary TEXT, -- Extended summary
    practical_applications JSONB, -- Business applications
    related_legislation_categories JSONB, -- Links to fiscal/legal categories
    amazon_url VARCHAR(500),
    isbn VARCHAR(20),
    publication_year INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 2. MBA FRAMEWORKS & MENTAL MODELS
-- ====================================================================

CREATE TABLE IF NOT EXISTS mba_frameworks (
    id SERIAL PRIMARY KEY,
    framework_key VARCHAR(100) UNIQUE NOT NULL,
    framework_name VARCHAR(255) NOT NULL,
    book_id INTEGER REFERENCES mba_books(id),
    category VARCHAR(100), -- finance, marketing, strategy, psychology, etc.
    description TEXT NOT NULL,
    when_to_use TEXT, -- Situation where framework applies
    how_to_apply TEXT, -- Step-by-step application
    real_world_example TEXT, -- Concrete example
    fiscal_applications TEXT, -- How it applies to fiscal decisions
    decision_tree_mapping JSONB, -- Which decision trees use this framework
    related_frameworks JSONB, -- Array of related framework IDs
    visual_diagram_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 3. MBA-ENHANCED DECISION TREE INTEGRATION
-- ====================================================================

-- Link decision tree nodes to MBA frameworks
CREATE TABLE IF NOT EXISTS decision_node_mba_frameworks (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES decision_nodes(id) ON DELETE CASCADE,
    framework_id INTEGER REFERENCES mba_frameworks(id) ON DELETE CASCADE,
    application_context TEXT, -- How framework applies at this node
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(node_id, framework_id)
);

-- Link final answers to MBA recommendations
CREATE TABLE IF NOT EXISTS decision_answer_mba_insights (
    id SERIAL PRIMARY KEY,
    answer_id INTEGER REFERENCES decision_answers(id) ON DELETE CASCADE,
    framework_id INTEGER REFERENCES mba_frameworks(id) ON DELETE CASCADE,
    strategic_insight TEXT, -- MBA-enhanced strategic advice
    tactical_steps JSONB, -- Actionable steps based on framework
    case_study TEXT, -- Real-world application
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 4. USER MBA LEARNING TRACKING
-- ====================================================================

CREATE TABLE IF NOT EXISTS user_mba_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES mba_books(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, reading, completed
    frameworks_mastered JSONB, -- Array of framework IDs user has learned
    notes TEXT, -- User's personal notes
    rating INTEGER, -- 1-5 stars
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS user_framework_applications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    framework_id INTEGER REFERENCES mba_frameworks(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    business_situation TEXT, -- What situation they applied it to
    outcome TEXT, -- Result of applying framework
    effectiveness_rating INTEGER, -- 1-5 how well it worked
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 5. MBA CONSULTANT INTERACTION LOG
-- ====================================================================

CREATE TABLE IF NOT EXISTS mba_consultation_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    frameworks_suggested JSONB, -- Which frameworks AI recommended
    books_referenced JSONB, -- Which books were cited
    fiscal_mba_hybrid BOOLEAN DEFAULT FALSE, -- If combined fiscal + MBA advice
    user_found_helpful BOOLEAN,
    user_feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 6. INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_mba_books_category ON mba_books(category);
CREATE INDEX IF NOT EXISTS idx_mba_frameworks_category ON mba_frameworks(category);
CREATE INDEX IF NOT EXISTS idx_mba_frameworks_book ON mba_frameworks(book_id);
CREATE INDEX IF NOT EXISTS idx_decision_node_mba ON decision_node_mba_frameworks(node_id);
CREATE INDEX IF NOT EXISTS idx_user_mba_progress ON user_mba_progress(user_id, status);

-- ====================================================================
-- 7. INSERT PERSONAL MBA BOOKS (All 99)
-- ====================================================================

INSERT INTO mba_books (book_number, title, author, category, core_concept) VALUES
(1, 'The Personal MBA: Master the Art of Business', 'Josh Kaufman', 'Foundation', 'Comprehensive overview of universal business principles and systems theory'),
(2, 'Go It Alone', 'Bruce Judson', 'Business Creation', 'Guidance on starting and running a solo business venture'),
(3, 'The Lean Startup', 'Eric Ries', 'Business Creation', 'Methodology for building businesses through rapid experimentation and iteration'),
(4, 'Street Smarts', 'Norm Brodsky & Bo Burlingham', 'Business Creation', 'Practical entrepreneurial wisdom from experienced business owners'),
(5, 'Ready, Fire, Aim', 'Michael Masterson', 'Business Creation', 'Framework for launching ventures quickly and adjusting strategy based on results'),
(6, 'Escape from Cubicle Nation', 'Pamela Slim', 'Business Creation', 'Strategies for leaving traditional employment to start your own business'),
(7, 'Bankable Business Plans', 'Edward Rogoff', 'Business Creation', 'How to create business plans that secure financing and support growth'),
(8, 'Rework', 'Jason Fried & David Heinemeier Hansson', 'Business Creation', 'Counterintuitive approaches to building successful modern businesses'),
(9, 'The New Business Road Test', 'John Mullins', 'Business Creation', 'Methods for validating business ideas before full commitment'),
(10, 'How to Make Millions with Your Ideas', 'Dan Kennedy', 'Business Creation', 'Techniques for profiting from creative concepts and innovations'),
(11, 'All Marketers Are Liars', 'Seth Godin', 'Marketing', 'Understanding how consumers perceive and choose products and services'),
(12, 'Permission Marketing', 'Seth Godin', 'Marketing', 'Building customer relationships through opted-in, relevant communications'),
(13, 'The 22 Immutable Laws of Marketing', 'Al Ries & Jack Trout', 'Marketing', 'Fundamental principles that govern successful market positioning'),
(14, 'Getting Everything You Can Out of All You''ve Got', 'Jay Abraham', 'Marketing', 'Maximizing revenue from existing customers and business assets'),
(15, 'The Psychology of Selling', 'Brian Tracy', 'Sales', 'Understanding buyer psychology to improve sales effectiveness'),
(16, 'Pitch Anything', 'Oren Klaff', 'Sales', 'Techniques for persuasively presenting ideas to skeptical audiences'),
(17, 'The Ultimate Sales Machine', 'Chet Holmes', 'Sales', 'Systems and strategies for building high-performance sales organizations'),
(18, 'Value-Based Fees', 'Alan Weiss', 'Sales', 'Setting prices based on value delivered rather than hours worked'),
(19, 'SPIN Selling', 'Neil Rackham', 'Sales', 'Questioning framework for consultative sales conversations'),
(20, 'Indispensable', 'Joe Calloway', 'Sales', 'Becoming irreplaceable by delivering exceptional customer value'),
(21, 'The Goal: A Process of Ongoing Improvement', 'Eliyahu Goldratt', 'Operations', 'Systems thinking approach to identifying and eliminating operational constraints'),
(22, 'Lean Thinking', 'James Womack & Daniel Jones', 'Operations', 'Eliminating waste and optimizing processes for continuous improvement'),
(23, 'Financial Intelligence for Entrepreneurs', 'Karen Berman & Joe Knight', 'Finance', 'Understanding financial statements and metrics for business management'),
(24, 'Simple Numbers, Straight Talk, Big Profits', 'Greg Crabtree', 'Finance', 'Practical financial guidance for small business owners'),
(25, 'The 1% Windfall', 'Rafi Mohammed', 'Finance', 'Price optimization strategies to significantly increase profitability'),
(26, 'Accounting Made Simple', 'Mike Piper', 'Finance', 'Fundamental accounting concepts and bookkeeping essentials'),
(27, 'How to Read a Financial Report', 'John A. Tracy', 'Finance', 'Interpreting financial statements to assess business health'),
(28, 'Venture Deals', 'Brad Feld & Jason Mendelson', 'Finance', 'Understanding venture capital financing and negotiating investment terms'),
(29, 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Psychology', 'Cognitive psychology insights explaining how people make decisions'),
(30, 'Brain Rules', 'John Medina', 'Psychology', 'Neuroscience principles about how the brain learns and functions'),
(31, 'Making Sense of Behavior', 'William T. Powers', 'Psychology', 'Theory of how human motivation and goal-seeking operate'),
(32, 'Driven', 'Paul Lawrence & Nitin Nohria', 'Psychology', 'Understanding fundamental human drives that motivate behavior'),
(33, 'Deep Survival', 'Laurence Gonzales', 'Psychology', 'Psychology of survival and decision-making under pressure'),
(34, 'Getting Things Done', 'David Allen', 'Productivity', 'Productivity system for capturing, organizing, and executing tasks'),
(35, 'The Power of Full Engagement', 'Jim Loehr & Tony Schwartz', 'Productivity', 'Managing energy and focus rather than just managing time'),
(36, 'StrengthsFinder 2.0', 'Tom Rath', 'Productivity', 'Identifying and leveraging personal strengths for greater effectiveness'),
(37, 'Bit Literacy', 'Mark Hurst', 'Productivity', 'Managing digital information to reduce overwhelm and improve focus'),
(38, '10 Days to Faster Reading', 'Abby Marks-Beale', 'Productivity', 'Techniques for increasing reading speed and comprehension'),
(39, 'The 80/20 Principle', 'Richard Koch', 'Productivity', 'Identifying and focusing on the vital few factors that drive results'),
(40, 'Accidental Genius', 'Mark Levy', 'Productivity', 'Using freewriting and thinking tools to solve problems creatively'),
(41, 'Learning from the Future', 'Liam Fahey & Robert Randall', 'Strategy', 'Scenario planning techniques for strategic decision-making'),
(42, 'The Power of Less', 'Leo Babauta', 'Productivity', 'Simplifying life and work by eliminating non-essentials'),
(43, 'The Path of Least Resistance', 'Robert Fritz', 'Psychology', 'Creating change through understanding how structures shape behavior'),
(44, 'Re-Create Your Life', 'Morty Lefkoe', 'Psychology', 'Changing limiting beliefs to transform personal and professional outcomes'),
(45, 'Self-Directed Behavior', 'David Watson & Roland Tharp', 'Psychology', 'Techniques for self-monitoring and changing personal habits'),
(46, 'Sources of Power: How People Make Decisions', 'Gary Klein', 'Psychology', 'How experienced professionals recognize patterns and make rapid decisions'),
(47, 'Smart Choices', 'John S. Hammond et al', 'Decision Making', 'Decision-making framework for evaluating complex options'),
(48, 'Ethics for the Real World', 'Ronald Howard & Clinton Korver', 'Ethics', 'Making ethical decisions in ambiguous business situations'),
(49, 'On Writing Well', 'William Zinsser', 'Communication', 'Principles of clear, engaging writing for business communication'),
(50, 'Presentation Zen', 'Garr Reynolds', 'Communication', 'Designing and delivering visual presentations that captivate audiences'),
(51, 'Made to Stick', 'Chip and Dan Heath', 'Communication', 'Crafting memorable messages that influence and persuade others'),
(52, 'The Copywriter''s Handbook', 'Robert Bly', 'Communication', 'Writing persuasive sales copy and promotional content'),
(53, 'Show Me The Numbers', 'Stephen Few', 'Communication', 'Presenting data visually to communicate insights effectively'),
(54, 'Influence: The Psychology of Persuasion', 'Robert B. Cialdini', 'Psychology', 'Psychological principles that guide human compliance and influence'),
(55, 'How to Win Friends and Influence People', 'Dale Carnegie', 'Communication', 'Timeless techniques for building relationships and persuading others'),
(56, 'Crucial Conversations', 'Kerry Patterson et al', 'Communication', 'Conducting difficult interpersonal discussions with honesty and respect'),
(57, 'The 48 Laws of Power', 'Robert Greene', 'Strategy', 'Observations about power dynamics in human relationships and organizations'),
(58, 'Bargaining For Advantage', 'G. Richard Shell', 'Negotiation', 'Negotiation strategy and tactics for achieving favorable outcomes'),
(59, '3-D Negotiation', 'David Lax & James Sebenius', 'Negotiation', 'Expanding negotiation possibilities by examining multiple dimensions'),
(60, 'The Partnership Charter', 'David Gage', 'Management', 'Creating agreements and structures for successful business partnerships'),
(61, 'First, Break All The Rules', 'Marcus Buckingham & Curt Coffman', 'Management', 'Management practices that create engaged and productive employees'),
(62, '12: The Elements of Great Managing', 'Rodd Wagner & James Harter', 'Management', 'Key management behaviors that drive employee engagement'),
(63, 'Growing Great Employees', 'Erika Andersen', 'Management', 'Developing talent through coaching and skill-building approaches'),
(64, 'The Essential Drucker', 'Peter Drucker', 'Management', 'Core management and organizational principles from a leading business thinker'),
(65, 'The Halo Effect', 'Phil Rosenzweig', 'Strategy', 'Recognizing cognitive biases that distort business analysis and strategy'),
(66, 'Tribes', 'Seth Godin', 'Leadership', 'Leading groups of people united by shared interests and values'),
(67, 'Total Leadership', 'Stewart Friedman', 'Leadership', 'Integrating work and personal life for authentic leadership presence'),
(68, 'What Got You Here Won''t Get You There', 'Marshall Goldsmith', 'Leadership', 'Overcoming habits that limit advancement and leadership effectiveness'),
(69, 'The New Leader''s 100-Day Action Plan', 'George Bradt et al', 'Leadership', 'Framework for successfully transitioning into leadership positions'),
(70, 'Making Things Happen', 'Scott Berkun', 'Management', 'Project management and leadership techniques for complex initiatives'),
(71, 'Results Without Authority', 'Tom Kendrick', 'Leadership', 'Influencing and delivering outcomes without direct control'),
(72, 'Thinking in Systems', 'Donella Meadows', 'Systems', 'Understanding complex systems and their feedback loops'),
(73, 'Work the System', 'Sam Carpenter', 'Systems', 'Creating business systems and processes that run efficiently'),
(74, 'Thinking Statistically', 'Uri Bram', 'Analytics', 'Statistical reasoning for better decision-making with data'),
(75, 'Turning Numbers Into Knowledge', 'Jonathan Koomey', 'Analytics', 'Analyzing quantitative data to generate meaningful business insights'),
(76, 'How to Lie with Statistics', 'Darrell Huff', 'Analytics', 'Recognizing statistical manipulation in data and reporting'),
(77, 'Marketing Metrics', 'Paul Farris et al', 'Analytics', 'Key performance indicators and measurements for marketing effectiveness'),
(78, 'The Economist Numbers Guide', 'Richard Stuteley', 'Analytics', 'Essential business and economic metrics and their interpretation'),
(79, 'The Unwritten Laws of Business', 'W.J. King', 'Management', 'Practical wisdom about office culture and professional behavior'),
(80, 'The Effective Executive', 'Peter Drucker', 'Productivity', 'Principles for becoming more productive and influential as a leader'),
(81, 'The Simplicity Survival Handbook', 'Bill Jensen', 'Productivity', 'Cutting through organizational complexity to improve effectiveness'),
(82, 'Hire With Your Head', 'Lou Adler', 'Management', 'Recruiting and hiring strategies for finding high-performing employees'),
(83, 'Purpose', 'Nikos Mourkogiannis', 'Strategy', 'Creating organizational direction through meaningful purpose and values'),
(84, 'Competitive Strategy', 'Michael Porter', 'Strategy', 'Analyzing competitive positioning and developing strategic advantage'),
(85, 'Blue Ocean Strategy', 'W. Chan Kim & Renée Mauborgne', 'Strategy', 'Creating uncontested market spaces instead of competing directly'),
(86, 'Seeing What''s Next', 'Clayton M. Christensen et al', 'Innovation', 'Applying disruption theory to anticipate market changes'),
(87, 'The Creative Habit', 'Twyla Tharp', 'Innovation', 'Developing consistent creative practice and overcoming creative blocks'),
(88, 'Myths of Innovation', 'Scott Berkun', 'Innovation', 'Understanding what actually drives successful innovation in organizations'),
(89, 'Innovation and Entrepreneurship', 'Peter Drucker', 'Innovation', 'Managing innovation as a deliberate business function'),
(90, 'The Design of Everyday Things', 'Donald Norman', 'Design', 'Creating intuitive products and interfaces through human-centered design'),
(91, 'Universal Principles of Design', 'William Lidwell et al', 'Design', 'Core design principles applicable across multiple disciplines'),
(92, 'Getting Started in Consulting', 'Alan Weiss', 'Consulting', 'Building and growing an independent consulting practice'),
(93, 'Secrets of Consulting', 'Gerald M. Weinberg', 'Consulting', 'Practical and philosophical insights for consulting success'),
(94, 'Your Money or Your Life', 'Joel Dominguez & Vicki Robin', 'Personal Finance', 'Achieving financial independence through intentional spending and saving'),
(95, 'The Millionaire Next Door', 'Thomas Stanley & William Danko', 'Personal Finance', 'Characteristics and habits of wealthy individuals building lasting wealth'),
(96, 'I Will Teach You To Be Rich', 'Ramit Sethi', 'Personal Finance', 'Practical personal finance strategy for earning, investing, and spending'),
(97, 'Fail-Safe Investing', 'Harry Browne', 'Personal Finance', 'Conservative investment approach emphasizing capital preservation'),
(98, 'Lead the Field', 'Earl Nightingale', 'Personal Development', 'Personal development principles for achieving professional success'),
(99, 'The Art of Exceptional Living', 'Jim Rohn', 'Personal Development', 'Personal growth philosophy focusing on habits and life design')
ON CONFLICT (book_number) DO NOTHING;

-- ====================================================================
-- 8. GRANT PERMISSIONS
-- ====================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO accountech_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO accountech_app;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
