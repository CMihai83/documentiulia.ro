-- ============================================================================
-- OBJECT-BASED ONLINE OFFICE - CORE REGISTRY
-- Central object registry enabling multi-dimensional business objects
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. BUSINESS OBJECTS REGISTRY
-- Universal registry for all business objects across all modules
-- ============================================================================

CREATE TABLE business_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- Object Type & Identity
    object_type VARCHAR(50) NOT NULL, -- 'product', 'sale_order', 'invoice', 'contact', etc.
    object_number VARCHAR(100), -- Human-readable reference (e.g., 'SO-2025-0042')
    object_subtype VARCHAR(50), -- Optional subcategory (e.g., 'retail_order', 'wholesale_order')

    -- Object State
    current_status VARCHAR(50), -- Current lifecycle status
    lifecycle_stage VARCHAR(50), -- draft, active, completed, archived, cancelled
    is_active BOOLEAN DEFAULT true,

    -- Object Metadata
    display_name VARCHAR(255), -- Human-friendly name for UI
    description TEXT,
    tags JSONB, -- Flexible tagging: ["urgent", "vip", "export"]
    custom_fields JSONB, -- Company-specific attributes
    search_vector tsvector, -- Full-text search optimization

    -- Ownership & Security
    owner_id UUID, -- REFERENCES users(id) - primary owner
    team_id UUID, -- REFERENCES teams(id) - team ownership
    visibility VARCHAR(50) DEFAULT 'private', -- private, team, company, public
    permissions JSONB, -- Granular access control

    -- Audit Trail
    created_by UUID, -- REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID, -- REFERENCES users(id)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    archived_by UUID
);

-- Indexes for performance
CREATE INDEX idx_business_objects_company ON business_objects(company_id);
CREATE INDEX idx_business_objects_type ON business_objects(object_type);
CREATE INDEX idx_business_objects_number ON business_objects(object_number);
CREATE INDEX idx_business_objects_status ON business_objects(current_status);
CREATE INDEX idx_business_objects_lifecycle ON business_objects(lifecycle_stage);
CREATE INDEX idx_business_objects_active ON business_objects(is_active) WHERE is_active = true;
CREATE INDEX idx_business_objects_search ON business_objects USING gin(search_vector);
CREATE INDEX idx_business_objects_tags ON business_objects USING gin(tags);

COMMENT ON TABLE business_objects IS 'Universal registry for all business objects across modules';

-- ============================================================================
-- 2. OBJECT RELATIONSHIPS
-- Maps relationships between business objects (many-to-many)
-- ============================================================================

CREATE TABLE object_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship Endpoints
    parent_object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    child_object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,

    -- Relationship Metadata
    relationship_type VARCHAR(50) NOT NULL, -- 'created_from', 'generated', 'converted_to', 'linked_to', 'depends_on'
    relationship_subtype VARCHAR(50), -- Optional detail (e.g., 'payment_for', 'shipment_of')

    -- Relationship Attributes
    strength DECIMAL(3,2), -- 0.0 to 1.0 - importance/strength of relationship
    is_bidirectional BOOLEAN DEFAULT false,
    metadata JSONB, -- Additional relationship data

    -- Audit
    created_by UUID, -- REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate relationships
    CONSTRAINT unique_relationship UNIQUE(parent_object_id, child_object_id, relationship_type)
);

CREATE INDEX idx_object_relationships_parent ON object_relationships(parent_object_id);
CREATE INDEX idx_object_relationships_child ON object_relationships(child_object_id);
CREATE INDEX idx_object_relationships_type ON object_relationships(relationship_type);

COMMENT ON TABLE object_relationships IS 'Graph of relationships between business objects';

-- ============================================================================
-- 3. OBJECT EVENTS (Audit Trail & Event Sourcing)
-- Complete history of all state changes and interactions with objects
-- ============================================================================

CREATE TABLE object_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event Identity
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'deleted', 'restored'
    event_subtype VARCHAR(50), -- Detailed event classification

    -- Event Data
    event_data JSONB, -- Complete state snapshot or delta
    previous_state JSONB, -- State before event (for undo/audit)
    new_state JSONB, -- State after event

    -- Context
    triggered_by_user_id UUID, -- REFERENCES users(id)
    triggered_by_system VARCHAR(100), -- 'api', 'cron', 'webhook', 'integration'
    ip_address INET,
    user_agent VARCHAR(255),

    -- Impact
    affects_modules VARCHAR(100)[], -- ['sales', 'inventory', 'accounting']
    cascade_count INTEGER DEFAULT 0, -- How many other objects were affected

    -- Metadata
    event_source VARCHAR(50), -- 'ui', 'api', 'background_job', 'external_integration'
    correlation_id UUID, -- Group related events
    session_id UUID, -- User session tracking

    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,

    -- Performance tracking
    processing_time_ms INTEGER
);

-- Indexes for querying and analytics
CREATE INDEX idx_object_events_object ON object_events(object_id);
CREATE INDEX idx_object_events_type ON object_events(event_type);
CREATE INDEX idx_object_events_created ON object_events(created_at DESC);
CREATE INDEX idx_object_events_user ON object_events(triggered_by_user_id);
CREATE INDEX idx_object_events_correlation ON object_events(correlation_id);

-- Partition by date for performance (monthly partitions)
-- CREATE TABLE object_events_2025_11 PARTITION OF object_events
-- FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

COMMENT ON TABLE object_events IS 'Complete audit trail and event sourcing for all business objects';

-- ============================================================================
-- 4. OBJECT DIMENSIONS
-- Multi-dimensional attributes for objects (EAV pattern for flexibility)
-- ============================================================================

CREATE TABLE object_dimensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,

    -- Dimension Identity
    dimension_name VARCHAR(50) NOT NULL, -- 'sales', 'accounting', 'inventory', 'crm', etc.
    attribute_key VARCHAR(100) NOT NULL, -- 'revenue', 'stock_level', 'customer_tier'

    -- Dimension Value (polymorphic)
    value_type VARCHAR(20) NOT NULL, -- 'string', 'number', 'boolean', 'date', 'json'
    value_string VARCHAR(500),
    value_number DECIMAL(20,4),
    value_boolean BOOLEAN,
    value_date DATE,
    value_timestamp TIMESTAMP,
    value_json JSONB,

    -- Metadata
    is_calculated BOOLEAN DEFAULT false, -- Is this derived from other values?
    calculation_formula TEXT, -- SQL or expression to recalculate
    last_calculated_at TIMESTAMP,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_dimension UNIQUE(object_id, dimension_name, attribute_key)
);

CREATE INDEX idx_object_dimensions_object ON object_dimensions(object_id);
CREATE INDEX idx_object_dimensions_dimension ON object_dimensions(dimension_name);
CREATE INDEX idx_object_dimensions_key ON object_dimensions(attribute_key);

COMMENT ON TABLE object_dimensions IS 'Flexible multi-dimensional attributes for business objects';

-- ============================================================================
-- 5. OBJECT TAGS (Flexible Categorization)
-- ============================================================================

CREATE TABLE object_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- Tag Identity
    tag_name VARCHAR(50) NOT NULL,
    tag_category VARCHAR(50), -- 'priority', 'status', 'department', 'custom'
    tag_color VARCHAR(7), -- Hex color for UI: #FF5733

    -- Tag Metadata
    description TEXT,
    is_system_tag BOOLEAN DEFAULT false, -- System-created vs user-created

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,

    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_tag UNIQUE(company_id, tag_name)
);

-- Many-to-many relationship: objects <-> tags
CREATE TABLE object_tag_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES object_tags(id) ON DELETE CASCADE,

    assigned_by UUID, -- REFERENCES users(id)
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_tag_assignment UNIQUE(object_id, tag_id)
);

CREATE INDEX idx_object_tag_assignments_object ON object_tag_assignments(object_id);
CREATE INDEX idx_object_tag_assignments_tag ON object_tag_assignments(tag_id);

-- ============================================================================
-- 6. OBJECT ATTACHMENTS (Files, Documents, Images)
-- ============================================================================

CREATE TABLE object_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,

    -- File Metadata
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100), -- MIME type: 'application/pdf', 'image/jpeg'
    file_size_bytes BIGINT,
    file_path VARCHAR(500), -- S3 path or local storage path
    file_url VARCHAR(500), -- Public URL if shared

    -- File Classification
    attachment_type VARCHAR(50), -- 'invoice', 'contract', 'receipt', 'photo', 'document'
    description TEXT,

    -- Access Control
    is_public BOOLEAN DEFAULT false,
    requires_authentication BOOLEAN DEFAULT true,

    -- OCR & AI Extraction
    ocr_text TEXT, -- Extracted text from OCR
    extracted_data JSONB, -- AI-extracted structured data
    ocr_confidence DECIMAL(5,2), -- 0-100%

    -- Audit
    uploaded_by UUID, -- REFERENCES users(id)
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Virus scan
    virus_scan_status VARCHAR(20), -- 'pending', 'clean', 'infected'
    virus_scan_at TIMESTAMP
);

CREATE INDEX idx_object_attachments_object ON object_attachments(object_id);
CREATE INDEX idx_object_attachments_type ON object_attachments(attachment_type);

COMMENT ON TABLE object_attachments IS 'File attachments linked to business objects';

-- ============================================================================
-- 7. OBJECT COMMENTS & COLLABORATION
-- ============================================================================

CREATE TABLE object_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES object_comments(id), -- For threaded comments

    -- Comment Content
    comment_text TEXT NOT NULL,
    comment_html TEXT, -- Rich text version

    -- Comment Metadata
    is_internal BOOLEAN DEFAULT true, -- Internal note vs customer-visible
    is_pinned BOOLEAN DEFAULT false,

    -- Mentions & Notifications
    mentioned_users UUID[], -- Array of user IDs mentioned

    -- Reactions
    reactions JSONB, -- {"👍": ["user-1", "user-2"], "❤️": ["user-3"]}

    -- Audit
    created_by UUID, -- REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

CREATE INDEX idx_object_comments_object ON object_comments(object_id);
CREATE INDEX idx_object_comments_created ON object_comments(created_at DESC);
CREATE INDEX idx_object_comments_author ON object_comments(created_by);

COMMENT ON TABLE object_comments IS 'Comments and collaboration on business objects';

-- ============================================================================
-- 8. OBJECT NOTIFICATIONS & ALERTS
-- ============================================================================

CREATE TABLE object_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,

    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- 'status_change', 'due_date', 'alert', 'mention'
    notification_priority VARCHAR(20), -- 'low', 'medium', 'high', 'urgent'

    -- Message
    title VARCHAR(255) NOT NULL,
    message TEXT,
    action_url VARCHAR(500), -- Deep link to object

    -- Recipient
    recipient_user_id UUID, -- REFERENCES users(id)
    recipient_team_id UUID, -- REFERENCES teams(id) - for team notifications

    -- Delivery Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    delivery_status VARCHAR(20), -- 'pending', 'sent', 'delivered', 'failed'

    -- Delivery Channels
    sent_email BOOLEAN DEFAULT false,
    sent_push BOOLEAN DEFAULT false,
    sent_sms BOOLEAN DEFAULT false,
    sent_in_app BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- Auto-delete after expiration
);

CREATE INDEX idx_object_notifications_recipient ON object_notifications(recipient_user_id);
CREATE INDEX idx_object_notifications_object ON object_notifications(object_id);
CREATE INDEX idx_object_notifications_unread ON object_notifications(recipient_user_id, is_read) WHERE is_read = false;

COMMENT ON TABLE object_notifications IS 'Notifications and alerts for business object changes';

-- ============================================================================
-- 9. OBJECT WORKFLOW STATES (State Machine)
-- ============================================================================

CREATE TABLE object_workflow_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    object_type VARCHAR(50) NOT NULL, -- 'sale_order', 'invoice', etc.

    -- State Definition
    state_name VARCHAR(50) NOT NULL,
    state_category VARCHAR(50), -- 'draft', 'active', 'completed', 'cancelled'
    state_order INTEGER, -- Sequence order in workflow

    -- State Behavior
    is_initial_state BOOLEAN DEFAULT false,
    is_final_state BOOLEAN DEFAULT false,
    can_be_deleted BOOLEAN DEFAULT true,
    can_be_edited BOOLEAN DEFAULT true,

    -- Transitions
    allowed_next_states VARCHAR(50)[], -- Array of state names

    -- Actions on Enter/Exit
    on_enter_actions JSONB, -- Actions to execute when entering this state
    on_exit_actions JSONB, -- Actions to execute when leaving this state

    -- UI
    display_name VARCHAR(100),
    state_color VARCHAR(7), -- Hex color
    icon_name VARCHAR(50),

    CONSTRAINT unique_object_state UNIQUE(object_type, state_name)
);

COMMENT ON TABLE object_workflow_states IS 'Workflow state definitions for business objects';

-- ============================================================================
-- 10. OBJECT CALCULATED METRICS (Cached Analytics)
-- ============================================================================

CREATE TABLE object_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,

    -- Metric Identity
    metric_name VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50), -- 'financial', 'operational', 'quality', 'time'

    -- Metric Value
    metric_value DECIMAL(20,4),
    metric_unit VARCHAR(20), -- 'RON', 'USD', 'hours', 'units', 'percentage'

    -- Comparison
    previous_value DECIMAL(20,4),
    change_amount DECIMAL(20,4),
    change_percentage DECIMAL(5,2),
    trend VARCHAR(20), -- 'up', 'down', 'stable'

    -- Metadata
    calculation_method TEXT,
    calculated_at TIMESTAMP,
    valid_until TIMESTAMP, -- Cache expiration

    CONSTRAINT unique_object_metric UNIQUE(object_id, metric_name)
);

CREATE INDEX idx_object_metrics_object ON object_metrics(object_id);
CREATE INDEX idx_object_metrics_name ON object_metrics(metric_name);

COMMENT ON TABLE object_metrics IS 'Cached calculated metrics for business objects';

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update search vector on business objects
CREATE OR REPLACE FUNCTION update_business_object_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.object_number, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE OF object_number, display_name, description ON business_objects
    FOR EACH ROW
    EXECUTE FUNCTION update_business_object_search_vector();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_objects_updated_at
    BEFORE UPDATE ON business_objects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-create event on business object changes
CREATE OR REPLACE FUNCTION log_business_object_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO object_events (
            object_id,
            event_type,
            event_data,
            new_state,
            triggered_by_user_id
        ) VALUES (
            NEW.id,
            'created',
            to_jsonb(NEW),
            to_jsonb(NEW),
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO object_events (
            object_id,
            event_type,
            event_data,
            previous_state,
            new_state,
            triggered_by_user_id
        ) VALUES (
            NEW.id,
            'updated',
            jsonb_build_object('changes', to_jsonb(NEW) - to_jsonb(OLD)),
            to_jsonb(OLD),
            to_jsonb(NEW),
            NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_business_object_events
    AFTER INSERT OR UPDATE ON business_objects
    FOR EACH ROW
    EXECUTE FUNCTION log_business_object_event();

COMMIT;

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Find all objects related to a customer
/*
SELECT
    bo.*,
    array_agg(DISTINCT r.relationship_type) as relationships
FROM business_objects bo
LEFT JOIN object_relationships r ON r.child_object_id = bo.id
WHERE r.parent_object_id = 'customer-uuid'
GROUP BY bo.id;
*/

-- Get complete object history
/*
SELECT
    oe.event_type,
    oe.event_data,
    oe.created_at,
    u.first_name || ' ' || u.last_name as triggered_by
FROM object_events oe
LEFT JOIN users u ON u.id = oe.triggered_by_user_id
WHERE oe.object_id = 'object-uuid'
ORDER BY oe.created_at DESC;
*/

-- Find objects by tags
/*
SELECT DISTINCT bo.*
FROM business_objects bo
INNER JOIN object_tag_assignments ota ON ota.object_id = bo.id
INNER JOIN object_tags ot ON ot.id = ota.tag_id
WHERE ot.tag_name IN ('urgent', 'vip')
AND bo.company_id = 'company-uuid';
*/
