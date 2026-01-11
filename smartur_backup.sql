--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price integer NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    active boolean DEFAULT true,
    daily_frequency integer DEFAULT 1,
    default_times text DEFAULT '[]'::text,
    confirmation_message text DEFAULT 'Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Teşekkür ederiz.'::text,
    default_capacity integer DEFAULT 10,
    agency_phone text,
    admin_phone text,
    send_notification_to_agency boolean DEFAULT true,
    send_notification_to_admin boolean DEFAULT true,
    notification_message_template text DEFAULT 'Yeni Rezervasyon:
Müşteri: {isim}
Telefon: {telefonunuz}
Eposta: {emailiniz}
Tarih: {tarih}
Saat: {saat}
Aktivite: {aktivite}
Kişi Sayısı: {kisiSayisi}'::text,
    name_aliases text DEFAULT '[]'::text,
    price_usd integer DEFAULT 0,
    reservation_link text,
    reservation_link_en text,
    has_free_hotel_transfer boolean DEFAULT false,
    transfer_zones text DEFAULT '[]'::text,
    extras text DEFAULT '[]'::text,
    faq text DEFAULT '[]'::text,
    color text DEFAULT 'blue'::text,
    tenant_id integer,
    shared_with_partners boolean DEFAULT false
);


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: activity_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_costs (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    month text NOT NULL,
    fixed_cost integer DEFAULT 0,
    variable_cost_per_guest integer DEFAULT 0,
    notes text,
    tenant_id integer
);


--
-- Name: activity_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_costs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_costs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_costs_id_seq OWNED BY public.activity_costs.id;


--
-- Name: activity_partner_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_partner_shares (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    partnership_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    partner_unit_price integer,
    partner_currency text DEFAULT 'TRY'::text
);


--
-- Name: activity_partner_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_partner_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_partner_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_partner_shares_id_seq OWNED BY public.activity_partner_shares.id;


--
-- Name: agencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agencies (
    id integer NOT NULL,
    name text NOT NULL,
    contact_info text,
    default_payout_per_guest integer DEFAULT 0,
    notes text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer,
    partner_tenant_id integer,
    partnership_id integer,
    is_smart_user boolean DEFAULT false
);


--
-- Name: agencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agencies_id_seq OWNED BY public.agencies.id;


--
-- Name: agency_activity_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency_activity_rates (
    id integer NOT NULL,
    agency_id integer NOT NULL,
    activity_id integer,
    valid_from text NOT NULL,
    valid_to text,
    unit_payout_tl integer NOT NULL,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    unit_payout_usd integer,
    currency text DEFAULT 'TRY'::text NOT NULL,
    tenant_id integer
);


--
-- Name: agency_activity_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agency_activity_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agency_activity_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agency_activity_rates_id_seq OWNED BY public.agency_activity_rates.id;


--
-- Name: agency_activity_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency_activity_terms (
    id integer NOT NULL,
    agency_id integer NOT NULL,
    activity_id integer NOT NULL,
    payout_per_guest integer DEFAULT 0,
    effective_month text,
    tenant_id integer
);


--
-- Name: agency_activity_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agency_activity_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agency_activity_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agency_activity_terms_id_seq OWNED BY public.agency_activity_terms.id;


--
-- Name: agency_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency_notes (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    admin_id integer,
    content text NOT NULL,
    note_type text DEFAULT 'general'::text,
    is_important boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: agency_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agency_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agency_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agency_notes_id_seq OWNED BY public.agency_notes.id;


--
-- Name: agency_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency_payouts (
    id integer NOT NULL,
    agency_id integer NOT NULL,
    period_start text NOT NULL,
    period_end text NOT NULL,
    description text,
    guest_count integer DEFAULT 0,
    base_amount_tl integer DEFAULT 0,
    vat_rate_pct integer DEFAULT 20,
    vat_amount_tl integer DEFAULT 0,
    total_amount_tl integer DEFAULT 0,
    method text,
    reference text,
    notes text,
    status text DEFAULT 'paid'::text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer,
    confirmation_status text DEFAULT 'pending'::text,
    confirmed_by_tenant_id integer,
    confirmed_at timestamp without time zone,
    rejection_reason text
);


--
-- Name: agency_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agency_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agency_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agency_payouts_id_seq OWNED BY public.agency_payouts.id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'info'::text,
    target_audience text DEFAULT 'all'::text,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    starts_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: api_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_status_logs (
    id integer NOT NULL,
    service text NOT NULL,
    status text NOT NULL,
    response_time_ms integer,
    error_message text,
    error_count integer DEFAULT 0,
    last_success_at timestamp without time zone,
    last_error_at timestamp without time zone,
    checked_at timestamp without time zone DEFAULT now()
);


--
-- Name: api_status_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_status_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_status_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_status_logs_id_seq OWNED BY public.api_status_logs.id;


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    phone text,
    company_name text,
    membership_type text DEFAULT 'trial'::text,
    membership_start_date timestamp without time zone,
    membership_end_date timestamp without time zone,
    plan_id integer,
    is_active boolean DEFAULT true,
    is_suspended boolean DEFAULT false,
    suspend_reason text,
    max_activities integer DEFAULT 5,
    max_reservations_per_month integer DEFAULT 100,
    last_login_at timestamp without time zone,
    login_count integer DEFAULT 0,
    created_by integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer,
    is_system_protected boolean DEFAULT false
);


--
-- Name: app_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_users_id_seq OWNED BY public.app_users.id;


--
-- Name: app_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_versions (
    id integer NOT NULL,
    version text NOT NULL,
    file_name text NOT NULL,
    file_size integer DEFAULT 0,
    checksum text,
    status text DEFAULT 'pending'::text,
    notes text,
    uploaded_by text DEFAULT 'super_admin'::text,
    backup_file_name text,
    is_rollback_target boolean DEFAULT false,
    activated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: app_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_versions_id_seq OWNED BY public.app_versions.id;


--
-- Name: auto_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_responses (
    id integer NOT NULL,
    name text NOT NULL,
    keywords text NOT NULL,
    response text NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    keywords_en text DEFAULT '[]'::text,
    response_en text DEFAULT ''::text,
    tenant_id integer
);


--
-- Name: auto_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auto_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auto_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auto_responses_id_seq OWNED BY public.auto_responses.id;


--
-- Name: blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blacklist (
    id integer NOT NULL,
    phone text NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


--
-- Name: blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blacklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blacklist_id_seq OWNED BY public.blacklist.id;


--
-- Name: bot_quality_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_quality_scores (
    id integer NOT NULL,
    message_id integer,
    phone text,
    question text,
    response text,
    response_time_ms integer,
    was_escalated boolean DEFAULT false,
    was_helpful boolean,
    feedback_score integer,
    error_occurred boolean DEFAULT false,
    used_fallback boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


--
-- Name: bot_quality_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bot_quality_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bot_quality_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bot_quality_scores_id_seq OWNED BY public.bot_quality_scores.id;


--
-- Name: capacity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacity (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    total_slots integer NOT NULL,
    booked_slots integer DEFAULT 0,
    tenant_id integer
);


--
-- Name: capacity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.capacity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: capacity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.capacity_id_seq OWNED BY public.capacity.id;


--
-- Name: customer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_requests (
    id integer NOT NULL,
    reservation_id integer NOT NULL,
    request_type text NOT NULL,
    request_details text,
    preferred_time text,
    customer_name text NOT NULL,
    customer_phone text,
    customer_email text,
    status text DEFAULT 'pending'::text,
    admin_notes text,
    email_sent boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone,
    tenant_id integer
);


--
-- Name: customer_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_requests_id_seq OWNED BY public.customer_requests.id;


--
-- Name: daily_message_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_message_usage (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    date text NOT NULL,
    message_count integer DEFAULT 0,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: daily_message_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_message_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_message_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_message_usage_id_seq OWNED BY public.daily_message_usage.id;


--
-- Name: database_backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.database_backups (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    file_name text NOT NULL,
    file_size integer DEFAULT 0,
    table_count integer DEFAULT 0,
    row_count integer DEFAULT 0,
    status text DEFAULT 'completed'::text,
    backup_type text DEFAULT 'manual'::text,
    created_by text DEFAULT 'super_admin'::text,
    restored_at timestamp without time zone,
    restored_by text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: database_backups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.database_backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: database_backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.database_backups_id_seq OWNED BY public.database_backups.id;


--
-- Name: dispatch_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispatch_shares (
    id integer NOT NULL,
    dispatch_id integer NOT NULL,
    partnership_id integer NOT NULL,
    sender_tenant_id integer NOT NULL,
    receiver_tenant_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    shared_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone,
    processed_by integer,
    process_notes text,
    linked_reservation_id integer
);


--
-- Name: dispatch_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dispatch_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispatch_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dispatch_shares_id_seq OWNED BY public.dispatch_shares.id;


--
-- Name: error_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_events (
    id integer NOT NULL,
    tenant_id integer,
    severity text NOT NULL,
    category text NOT NULL,
    source text NOT NULL,
    message text NOT NULL,
    suggestion text,
    request_path text,
    request_method text,
    status_code integer,
    user_id integer,
    user_email text,
    tenant_name text,
    metadata text,
    occurred_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'open'::text,
    resolved_at timestamp without time zone,
    resolved_by text,
    resolution_notes text
);


--
-- Name: error_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.error_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: error_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.error_events_id_seq OWNED BY public.error_events.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    name text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    type text DEFAULT 'official'::text,
    keywords text DEFAULT '[]'::text,
    notes text,
    is_active boolean DEFAULT true,
    tenant_id integer
);


--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: in_app_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.in_app_notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: in_app_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.in_app_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: in_app_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.in_app_notifications_id_seq OWNED BY public.in_app_notifications.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    tenant_id integer,
    subscription_id integer,
    invoice_number text NOT NULL,
    agency_name text NOT NULL,
    agency_email text,
    period_start text NOT NULL,
    period_end text NOT NULL,
    subtotal_tl integer DEFAULT 0,
    vat_rate_pct integer DEFAULT 20,
    vat_amount_tl integer DEFAULT 0,
    total_tl integer DEFAULT 0,
    subtotal_usd integer DEFAULT 0,
    total_usd integer DEFAULT 0,
    currency text DEFAULT 'TRY'::text,
    status text DEFAULT 'pending'::text,
    due_date text,
    paid_at timestamp without time zone,
    payment_method text,
    payment_reference text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: license; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license (
    id integer NOT NULL,
    license_key text NOT NULL,
    agency_name text NOT NULL,
    agency_email text,
    agency_phone text,
    plan_type text DEFAULT 'trial'::text,
    plan_name text DEFAULT 'Deneme'::text,
    max_activities integer DEFAULT 5,
    max_reservations_per_month integer DEFAULT 100,
    max_users integer DEFAULT 1,
    features text DEFAULT '[]'::text,
    start_date timestamp without time zone DEFAULT now(),
    expiry_date timestamp without time zone,
    is_active boolean DEFAULT true,
    last_verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: license_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_id_seq OWNED BY public.license.id;


--
-- Name: login_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_logs (
    id integer NOT NULL,
    admin_id integer,
    email text NOT NULL,
    ip_address text,
    user_agent text,
    status text NOT NULL,
    failure_reason text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_logs_id_seq OWNED BY public.login_logs.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    phone text NOT NULL,
    content text NOT NULL,
    role text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    requires_human_intervention boolean DEFAULT false,
    tenant_id integer
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: package_tour_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_tour_activities (
    id integer NOT NULL,
    package_tour_id integer NOT NULL,
    activity_id integer NOT NULL,
    day_offset integer DEFAULT 0,
    default_time text DEFAULT '09:00'::text,
    sort_order integer DEFAULT 0,
    tenant_id integer
);


--
-- Name: package_tour_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.package_tour_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: package_tour_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.package_tour_activities_id_seq OWNED BY public.package_tour_activities.id;


--
-- Name: package_tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_tours (
    id integer NOT NULL,
    name text NOT NULL,
    name_aliases text DEFAULT '[]'::text,
    description text,
    price integer DEFAULT 0,
    price_usd integer DEFAULT 0,
    confirmation_message text DEFAULT 'Sayın {isim}, paket tur rezervasyonunuz onaylanmıştır. Tarih: {tarih}. Teşekkür ederiz.'::text,
    reservation_link text,
    reservation_link_en text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    faq text DEFAULT '[]'::text,
    tenant_id integer
);


--
-- Name: package_tours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.package_tours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: package_tours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.package_tours_id_seq OWNED BY public.package_tours.id;


--
-- Name: partner_invite_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_invite_codes (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    max_usage integer,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: partner_invite_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_invite_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_invite_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_invite_codes_id_seq OWNED BY public.partner_invite_codes.id;


--
-- Name: partner_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_transactions (
    id integer NOT NULL,
    reservation_id integer NOT NULL,
    sender_tenant_id integer NOT NULL,
    receiver_tenant_id integer NOT NULL,
    activity_id integer NOT NULL,
    guest_count integer NOT NULL,
    unit_price integer NOT NULL,
    total_price integer NOT NULL,
    currency text DEFAULT 'TRY'::text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    reservation_date text NOT NULL,
    reservation_time text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    paid_at timestamp without time zone,
    payment_collection_type text DEFAULT 'receiver_full'::text,
    amount_collected_by_sender integer DEFAULT 0,
    amount_due_to_receiver integer DEFAULT 0,
    balance_owed integer DEFAULT 0,
    deletion_requested_at timestamp without time zone,
    deletion_requested_by_tenant_id integer,
    deletion_status text,
    deletion_rejection_reason text
);


--
-- Name: partner_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_transactions_id_seq OWNED BY public.partner_transactions.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    settlement_id integer,
    amount_tl integer NOT NULL,
    method text,
    reference text,
    notes text,
    paid_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text,
    sort_order integer DEFAULT 0
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_features (
    id integer NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text,
    icon text DEFAULT 'Star'::text,
    category text DEFAULT 'general'::text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: plan_features_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_features_id_seq OWNED BY public.plan_features.id;


--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_admins (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'support'::text,
    is_active boolean DEFAULT true,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: platform_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platform_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_admins_id_seq OWNED BY public.platform_admins.id;


--
-- Name: platform_support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_support_tickets (
    id integer NOT NULL,
    tenant_id integer,
    agency_name text,
    agency_email text,
    subject text NOT NULL,
    description text NOT NULL,
    priority text DEFAULT 'normal'::text,
    status text DEFAULT 'open'::text,
    category text DEFAULT 'general'::text,
    assigned_to integer,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: platform_support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platform_support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_support_tickets_id_seq OWNED BY public.platform_support_tickets.id;


--
-- Name: request_message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_message_templates (
    id integer NOT NULL,
    name text NOT NULL,
    template_type text NOT NULL,
    message_content text NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


--
-- Name: request_message_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.request_message_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: request_message_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.request_message_templates_id_seq OWNED BY public.request_message_templates.id;


--
-- Name: reservation_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservation_change_requests (
    id integer NOT NULL,
    reservation_id integer NOT NULL,
    tenant_id integer NOT NULL,
    initiated_by_type text NOT NULL,
    initiated_by_id integer,
    initiated_by_phone text,
    request_type text NOT NULL,
    original_date text,
    original_time text,
    requested_date text,
    requested_time text,
    request_details text,
    status text DEFAULT 'pending'::text NOT NULL,
    processed_by integer,
    processed_at timestamp without time zone,
    process_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: reservation_change_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reservation_change_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservation_change_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservation_change_requests_id_seq OWNED BY public.reservation_change_requests.id;


--
-- Name: reservation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservation_requests (
    id integer NOT NULL,
    tenant_id integer,
    activity_id integer NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    guests integer DEFAULT 1,
    notes text,
    status text DEFAULT 'pending'::text,
    requested_by integer,
    processed_by integer,
    processed_at timestamp without time zone,
    process_notes text,
    reservation_id integer,
    created_at timestamp without time zone DEFAULT now(),
    payment_collection_type text DEFAULT 'receiver_full'::text,
    amount_collected_by_sender integer DEFAULT 0,
    payment_currency text DEFAULT 'TRY'::text,
    payment_notes text
);


--
-- Name: reservation_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reservation_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservation_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservation_requests_id_seq OWNED BY public.reservation_requests.id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id integer NOT NULL,
    activity_id integer,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_email text,
    date text NOT NULL,
    "time" text NOT NULL,
    quantity integer NOT NULL,
    status text DEFAULT 'pending'::text,
    source text DEFAULT 'whatsapp'::text,
    external_id text,
    created_at timestamp without time zone DEFAULT now(),
    price_tl integer DEFAULT 0,
    price_usd integer DEFAULT 0,
    currency text DEFAULT 'TRY'::text,
    agency_id integer,
    order_subtotal integer DEFAULT 0,
    order_total integer DEFAULT 0,
    order_tax integer DEFAULT 0,
    settlement_id integer,
    package_tour_id integer,
    parent_reservation_id integer,
    order_number text,
    tracking_token text,
    tracking_token_expires_at timestamp without time zone,
    hotel_name text,
    has_transfer boolean DEFAULT false,
    tenant_id integer,
    payment_status text DEFAULT 'unpaid'::text,
    notes text
);


--
-- Name: reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    color text DEFAULT 'blue'::text,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    tenant_id integer
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: settlement_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_entries (
    id integer NOT NULL,
    settlement_id integer NOT NULL,
    reservation_id integer,
    activity_id integer,
    guest_count integer DEFAULT 0,
    revenue_tl integer DEFAULT 0,
    cost_tl integer DEFAULT 0,
    payout_tl integer DEFAULT 0,
    tenant_id integer
);


--
-- Name: settlement_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settlement_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settlement_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settlement_entries_id_seq OWNED BY public.settlement_entries.id;


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlements (
    id integer NOT NULL,
    agency_id integer NOT NULL,
    period_start text NOT NULL,
    period_end text NOT NULL,
    status text DEFAULT 'draft'::text,
    total_guests integer DEFAULT 0,
    gross_sales_tl integer DEFAULT 0,
    gross_sales_usd integer DEFAULT 0,
    total_cost_tl integer DEFAULT 0,
    payout_tl integer DEFAULT 0,
    payout_usd integer DEFAULT 0,
    vat_rate_pct integer DEFAULT 20,
    vat_amount_tl integer DEFAULT 0,
    profit_tl integer DEFAULT 0,
    paid_amount_tl integer DEFAULT 0,
    remaining_tl integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    extras_tl integer DEFAULT 0,
    tenant_id integer
);


--
-- Name: settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settlements_id_seq OWNED BY public.settlements.id;


--
-- Name: subscription_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_payments (
    id integer NOT NULL,
    subscription_id integer NOT NULL,
    amount_tl integer DEFAULT 0,
    amount_usd integer DEFAULT 0,
    currency text DEFAULT 'TRY'::text,
    status text DEFAULT 'pending'::text,
    payment_method text,
    provider_payment_id text,
    provider_response text,
    invoice_number text,
    invoice_url text,
    failure_reason text,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_payments_id_seq OWNED BY public.subscription_payments.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    price_tl integer DEFAULT 0,
    price_usd integer DEFAULT 0,
    yearly_price_tl integer DEFAULT 0,
    yearly_price_usd integer DEFAULT 0,
    yearly_discount_pct integer DEFAULT 20,
    trial_days integer DEFAULT 14,
    max_activities integer DEFAULT 5,
    max_reservations_per_month integer DEFAULT 100,
    max_users integer DEFAULT 1,
    max_whatsapp_numbers integer DEFAULT 1,
    features text DEFAULT '[]'::text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_popular boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    max_daily_messages integer DEFAULT 50,
    max_daily_reservations integer DEFAULT 10
);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    tenant_id integer,
    plan_id integer NOT NULL,
    status text DEFAULT 'trial'::text,
    billing_cycle text DEFAULT 'monthly'::text,
    current_period_start timestamp without time zone,
    current_period_end timestamp without time zone,
    trial_end timestamp without time zone,
    cancelled_at timestamp without time zone,
    cancel_reason text,
    payment_provider text DEFAULT 'paytr'::text,
    provider_customer_id text,
    provider_subscription_id text,
    last_payment_at timestamp without time zone,
    next_payment_at timestamp without time zone,
    failed_payment_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: supplier_dispatch_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_dispatch_items (
    id integer NOT NULL,
    dispatch_id integer NOT NULL,
    item_type text DEFAULT 'base'::text NOT NULL,
    label text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_amount integer DEFAULT 0 NOT NULL,
    total_amount integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'TRY'::text NOT NULL,
    notes text
);


--
-- Name: supplier_dispatch_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_dispatch_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_dispatch_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_dispatch_items_id_seq OWNED BY public.supplier_dispatch_items.id;


--
-- Name: supplier_dispatches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_dispatches (
    id integer NOT NULL,
    agency_id integer NOT NULL,
    activity_id integer,
    dispatch_date text NOT NULL,
    dispatch_time text,
    guest_count integer DEFAULT 0 NOT NULL,
    unit_payout_tl integer DEFAULT 0,
    total_payout_tl integer DEFAULT 0,
    payout_id integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    rate_id integer,
    tenant_id integer,
    currency text DEFAULT 'TRY'::text NOT NULL,
    customer_name text
);


--
-- Name: supplier_dispatches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_dispatches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_dispatches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_dispatches_id_seq OWNED BY public.supplier_dispatches.id;


--
-- Name: support_request_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_request_logs (
    id integer NOT NULL,
    support_request_id integer NOT NULL,
    log_id integer,
    message_snapshot text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: support_request_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_request_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_request_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_request_logs_id_seq OWNED BY public.support_request_logs.id;


--
-- Name: support_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_requests (
    id integer NOT NULL,
    phone text NOT NULL,
    status text DEFAULT 'open'::text,
    reservation_id integer,
    created_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone,
    description text,
    tenant_id integer
);


--
-- Name: support_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_requests_id_seq OWNED BY public.support_requests.id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id integer NOT NULL,
    level text NOT NULL,
    source text NOT NULL,
    message text NOT NULL,
    details text,
    phone text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


--
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- Name: tenant_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_integrations (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    twilio_account_sid text,
    twilio_auth_token_encrypted text,
    twilio_whatsapp_number text,
    twilio_webhook_url text,
    twilio_configured boolean DEFAULT false,
    woocommerce_store_url text,
    woocommerce_consumer_key text,
    woocommerce_consumer_secret_encrypted text,
    woocommerce_webhook_secret text,
    woocommerce_configured boolean DEFAULT false,
    gmail_user text,
    gmail_app_password_encrypted text,
    gmail_from_name text,
    gmail_configured boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tenant_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_integrations_id_seq OWNED BY public.tenant_integrations.id;


--
-- Name: tenant_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_notification_settings (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    notification_type text NOT NULL,
    channels text[] DEFAULT ARRAY['whatsapp'::text],
    enabled boolean DEFAULT true,
    template_whatsapp text,
    template_email text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tenant_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_notification_settings_id_seq OWNED BY public.tenant_notification_settings.id;


--
-- Name: tenant_partnerships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_partnerships (
    id integer NOT NULL,
    requester_tenant_id integer NOT NULL,
    partner_tenant_id integer NOT NULL,
    invite_code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp without time zone DEFAULT now(),
    responded_at timestamp without time zone,
    notes text
);


--
-- Name: tenant_partnerships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_partnerships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenant_partnerships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_partnerships_id_seq OWNED BY public.tenant_partnerships.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    contact_email text,
    contact_phone text,
    address text,
    logo_url text,
    primary_color text DEFAULT '262 83% 58%'::text,
    accent_color text DEFAULT '142 76% 36%'::text,
    timezone text DEFAULT 'Europe/Istanbul'::text,
    language text DEFAULT 'tr'::text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    plan_code text DEFAULT 'trial'::text
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: ticket_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_responses (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    responder_id integer,
    responder_name text,
    content text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ticket_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_responses_id_seq OWNED BY public.ticket_responses.id;


--
-- Name: user_login_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_login_logs (
    id integer NOT NULL,
    user_id integer,
    username text NOT NULL,
    ip_address text,
    user_agent text,
    status text NOT NULL,
    failure_reason text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_login_logs_id_seq OWNED BY public.user_login_logs.id;


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    notification_type text NOT NULL,
    channels text[] DEFAULT ARRAY['app'::text],
    enabled boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_notification_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_notification_preferences_id_seq OWNED BY public.user_notification_preferences.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: viewer_activity_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viewer_activity_shares (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    viewer_user_id integer NOT NULL,
    activity_id integer NOT NULL,
    viewer_unit_price_try integer,
    viewer_unit_price_usd integer,
    viewer_unit_price_eur integer,
    is_shared boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: viewer_activity_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viewer_activity_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: viewer_activity_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viewer_activity_shares_id_seq OWNED BY public.viewer_activity_shares.id;


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_costs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_costs ALTER COLUMN id SET DEFAULT nextval('public.activity_costs_id_seq'::regclass);


--
-- Name: activity_partner_shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_partner_shares ALTER COLUMN id SET DEFAULT nextval('public.activity_partner_shares_id_seq'::regclass);


--
-- Name: agencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies ALTER COLUMN id SET DEFAULT nextval('public.agencies_id_seq'::regclass);


--
-- Name: agency_activity_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_rates ALTER COLUMN id SET DEFAULT nextval('public.agency_activity_rates_id_seq'::regclass);


--
-- Name: agency_activity_terms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_terms ALTER COLUMN id SET DEFAULT nextval('public.agency_activity_terms_id_seq'::regclass);


--
-- Name: agency_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_notes ALTER COLUMN id SET DEFAULT nextval('public.agency_notes_id_seq'::regclass);


--
-- Name: agency_payouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_payouts ALTER COLUMN id SET DEFAULT nextval('public.agency_payouts_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: api_status_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_status_logs ALTER COLUMN id SET DEFAULT nextval('public.api_status_logs_id_seq'::regclass);


--
-- Name: app_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users ALTER COLUMN id SET DEFAULT nextval('public.app_users_id_seq'::regclass);


--
-- Name: app_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_versions ALTER COLUMN id SET DEFAULT nextval('public.app_versions_id_seq'::regclass);


--
-- Name: auto_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_responses ALTER COLUMN id SET DEFAULT nextval('public.auto_responses_id_seq'::regclass);


--
-- Name: blacklist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklist ALTER COLUMN id SET DEFAULT nextval('public.blacklist_id_seq'::regclass);


--
-- Name: bot_quality_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_quality_scores ALTER COLUMN id SET DEFAULT nextval('public.bot_quality_scores_id_seq'::regclass);


--
-- Name: capacity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity ALTER COLUMN id SET DEFAULT nextval('public.capacity_id_seq'::regclass);


--
-- Name: customer_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_requests ALTER COLUMN id SET DEFAULT nextval('public.customer_requests_id_seq'::regclass);


--
-- Name: daily_message_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_message_usage ALTER COLUMN id SET DEFAULT nextval('public.daily_message_usage_id_seq'::regclass);


--
-- Name: database_backups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_backups ALTER COLUMN id SET DEFAULT nextval('public.database_backups_id_seq'::regclass);


--
-- Name: dispatch_shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares ALTER COLUMN id SET DEFAULT nextval('public.dispatch_shares_id_seq'::regclass);


--
-- Name: error_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_events ALTER COLUMN id SET DEFAULT nextval('public.error_events_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: in_app_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications ALTER COLUMN id SET DEFAULT nextval('public.in_app_notifications_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: license id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license ALTER COLUMN id SET DEFAULT nextval('public.license_id_seq'::regclass);


--
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: package_tour_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tour_activities ALTER COLUMN id SET DEFAULT nextval('public.package_tour_activities_id_seq'::regclass);


--
-- Name: package_tours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tours ALTER COLUMN id SET DEFAULT nextval('public.package_tours_id_seq'::regclass);


--
-- Name: partner_invite_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_invite_codes ALTER COLUMN id SET DEFAULT nextval('public.partner_invite_codes_id_seq'::regclass);


--
-- Name: partner_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_transactions ALTER COLUMN id SET DEFAULT nextval('public.partner_transactions_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: plan_features id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features ALTER COLUMN id SET DEFAULT nextval('public.plan_features_id_seq'::regclass);


--
-- Name: platform_admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins ALTER COLUMN id SET DEFAULT nextval('public.platform_admins_id_seq'::regclass);


--
-- Name: platform_support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_support_tickets ALTER COLUMN id SET DEFAULT nextval('public.platform_support_tickets_id_seq'::regclass);


--
-- Name: request_message_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_message_templates ALTER COLUMN id SET DEFAULT nextval('public.request_message_templates_id_seq'::regclass);


--
-- Name: reservation_change_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_change_requests ALTER COLUMN id SET DEFAULT nextval('public.reservation_change_requests_id_seq'::regclass);


--
-- Name: reservation_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_requests ALTER COLUMN id SET DEFAULT nextval('public.reservation_requests_id_seq'::regclass);


--
-- Name: reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: settlement_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_entries ALTER COLUMN id SET DEFAULT nextval('public.settlement_entries_id_seq'::regclass);


--
-- Name: settlements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements ALTER COLUMN id SET DEFAULT nextval('public.settlements_id_seq'::regclass);


--
-- Name: subscription_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments ALTER COLUMN id SET DEFAULT nextval('public.subscription_payments_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: supplier_dispatch_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatch_items ALTER COLUMN id SET DEFAULT nextval('public.supplier_dispatch_items_id_seq'::regclass);


--
-- Name: supplier_dispatches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatches ALTER COLUMN id SET DEFAULT nextval('public.supplier_dispatches_id_seq'::regclass);


--
-- Name: support_request_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_request_logs ALTER COLUMN id SET DEFAULT nextval('public.support_request_logs_id_seq'::regclass);


--
-- Name: support_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests ALTER COLUMN id SET DEFAULT nextval('public.support_requests_id_seq'::regclass);


--
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- Name: tenant_integrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations ALTER COLUMN id SET DEFAULT nextval('public.tenant_integrations_id_seq'::regclass);


--
-- Name: tenant_notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.tenant_notification_settings_id_seq'::regclass);


--
-- Name: tenant_partnerships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_partnerships ALTER COLUMN id SET DEFAULT nextval('public.tenant_partnerships_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: ticket_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_responses ALTER COLUMN id SET DEFAULT nextval('public.ticket_responses_id_seq'::regclass);


--
-- Name: user_login_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_logs ALTER COLUMN id SET DEFAULT nextval('public.user_login_logs_id_seq'::regclass);


--
-- Name: user_notification_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_notification_preferences_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: viewer_activity_shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_activity_shares ALTER COLUMN id SET DEFAULT nextval('public.viewer_activity_shares_id_seq'::regclass);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.activities VALUES (8, 'ATV Safari', '', 2000, 60, true, 3, '["09:00","13:00","17:00"]', 'Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Rezervasyonunuzu takip etmek için: {takip_linki} Teşekkür ederiz.', 10, NULL, NULL, true, true, 'Yeni Rezervasyon:
Müşteri: {isim}
Telefon: {telefonunuz}
Eposta: {emailiniz}
Tarih: {tarih}
Saat: {saat}
Aktivite: {aktivite}
Kişi Sayısı: {kişiSayısı}', '["atv safari","quad bike"]', 30, NULL, NULL, false, '[]', '[]', '[]', 'orange', 7, true);
INSERT INTO public.activities VALUES (9, 'Balon Turu', '', 5000, 30, true, 1, '["09:00"]', 'Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Rezervasyonunuzu takip etmek için: {takip_linki} Teşekkür ederiz.', 10, NULL, NULL, true, true, 'Yeni Rezervasyon:
Müşteri: {isim}
Telefon: {telefonunuz}
Eposta: {emailiniz}
Tarih: {tarih}
Saat: {saat}
Aktivite: {aktivite}
Kişi Sayısı: {kişiSayısı}', '["Ballon Tour"]', 120, NULL, NULL, false, '[]', '[]', '[]', 'blue', 9, true);
INSERT INTO public.activities VALUES (6, 'at turu', '', 1000, 26, true, 3, '["09:00","13:00","17:00"]', 'Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Rezervasyonunuzu takip etmek için: {takip_linki} Teşekkür ederiz.', 6, NULL, '323423423', false, true, 'Yeni Rezervasyon:
Müşteri: {isim}
Telefon: {telefonunuz}
Eposta: {emailiniz}
Tarih: {tarih}
Saat: {saat}
Aktivite: {aktivite}
Kişi Sayısı: {kişiSayısı}', '["horse"]', 10, 'https://skyfethiye.com/aktiviteler/fethiye-yamac-parasutu/', 'https://skyfethiye.com/en/activities/paragliding-fethiye/', true, '["hisarönü"]', '[{"name":"Fotoğraflar","priceTl":1000,"priceUsd":20,"description":"Opsiyonel"}]', '[{"question":"Kaç dakika","answer":"30 dakikalık tur"}]', 'pink', 7, false);
INSERT INTO public.activities VALUES (7, 'Tekne Turu', 'günlük tur ', 1000, 420, true, 1, '["09:00"]', NULL, 10, '23423423', '234234234', true, true, 'Yeni Rezervasyon:
Müşteri: {isim}
Telefon: {telefonunuz}
Eposta: {emailiniz}
Tarih: {tarih}
Saat: {saat}
Aktivite: {aktivite}
Kişi Sayısı: {kişiSayısı}', '["Boat Tour"]', 20, 'https://skyfethiye.com/aktiviteler/fethiye-yamac-parasutu/', 'https://skyfethiye.com/en/activities/paragliding-fethiye/', false, '[]', '[{"name":"kantin","priceTl":0,"priceUsd":0,"description":""}]', '[{"question":"Tekne kaç kişilik","answer":"teknemiz 100 kişiliktir"}]', 'green', 7, false);


--
-- Data for Name: activity_costs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: activity_partner_shares; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.activity_partner_shares VALUES (2, 8, 1, '2026-01-08 10:59:48.467765', 1500, 'TRY');
INSERT INTO public.activity_partner_shares VALUES (3, 9, 1, '2026-01-09 14:14:11.496287', 5500, 'TRY');


--
-- Data for Name: agencies; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.agencies VALUES (6, 'Viking Tekne Turu', '55555555555', 1000, 'Test Test', true, '2026-01-07 12:29:04.528778', NULL, NULL, NULL, false);
INSERT INTO public.agencies VALUES (7, 'Viking Tekne Turu', '555555555555', 10000, 'Test', true, '2026-01-07 12:29:41.150786', NULL, NULL, NULL, false);
INSERT INTO public.agencies VALUES (8, 'Bubbles', '5555555555', 1000, '', true, '2026-01-07 16:09:07.829746', 7, NULL, NULL, false);
INSERT INTO public.agencies VALUES (9, 'Viking Tekne Turu', '5555555555', 1000, '', true, '2026-01-07 16:28:15.803072', 7, NULL, NULL, false);
INSERT INTO public.agencies VALUES (10, 'Red Cloud Atv', '5555555555', 1500, '', true, '2026-01-08 04:46:59.313622', 7, NULL, NULL, false);
INSERT INTO public.agencies VALUES (12, 'Acenta 2', '5555555555', 0, 'Partner acenta - otomatik oluşturuldu', true, '2026-01-10 04:34:57.475164', 7, 9, 1, true);
INSERT INTO public.agencies VALUES (11, 'Acenta 1 ', '5555555555', 0, '', true, '2026-01-09 16:00:36.161299', 9, 7, 1, true);


--
-- Data for Name: agency_activity_rates; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: agency_activity_terms; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: agency_notes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: agency_payouts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.announcements VALUES (1, 'Yeni Ozellik', 'Artik rezervasyonlari surukle birak ile takvime ekleyebilirsiniz!', 'info', 'all', 0, true, NULL, NULL, '2026-01-06 07:54:50.712074');
INSERT INTO public.announcements VALUES (2, 'Bakim Bildirimi', 'Yarin gece 02:00-04:00 arasi sistem bakimda olacaktir.', 'warning', 'all', 0, true, NULL, NULL, '2026-01-05 07:54:50.712074');


--
-- Data for Name: api_status_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: app_users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.app_users VALUES (2, 'Skyfethiye', 'skyfethiye@gmail.com', 'd6042215e5d01947b1beaaf04caabf55:26c829fad3fbd602bdb5e63983fb06038964df318b6ff509137d6ee0f6cd492009ff185b5e510d950fa6ef8e9b2092374c67e57848b8f8575573d54dbc8aa72b', 'Metin Işık', '05384944505', 'Sky Fethiye', 'professional', '2026-01-05 14:51:26.753', NULL, NULL, true, false, NULL, 50, 1000, '2026-01-06 06:55:51.08', 9, NULL, 'Sky Fethiye acentasi yonetici hesabi', '2026-01-05 14:51:26.755282', '2026-01-05 15:28:51.142', 2, false);
INSERT INTO public.app_users VALUES (8, 'superadmin', 'flymet.mail@gmail.com', 'd7a0e0552941f2d4ca39a3e09306b3c9:1ad401276717ecf21f20f559374208ebc8fc0c37ef1479c57019bce0c8d7c1e546fa47526fd818cc2ed40a0173ddc36b8500710ab1bcf30eba476a73d0906333', 'Süper Admin', NULL, NULL, 'trial', NULL, NULL, NULL, true, false, NULL, 5, 100, NULL, 0, NULL, NULL, '2026-01-06 14:54:34.079292', '2026-01-06 14:54:34.079292', 8, true);
INSERT INTO public.app_users VALUES (9, 'isortagi2', '2232@gmail.com', '820a683b12616dafd4485aa355e2350f:8f05c73e21a1d1878f38a2e8f17560be890bdca74fc36215390e6dee45e9d7943fa217ff8cceb744d7da73c794133faae4d1875d6746ff5707128a44e40d10b3', 'İzleyici 1', '5305556557', 'acenta', 'professional', '2026-01-07 07:14:47.23', NULL, NULL, true, false, NULL, 50, 1000, '2026-01-07 07:20:13.889', 2, NULL, 'acenta acentasi kullanıcısi', '2026-01-07 07:14:47.237127', '2026-01-09 05:23:40.994', 7, false);
INSERT INTO public.app_users VALUES (10, 'acenta2', 'acenta2@acenta.com', '2ea928c8b4b1cd376177a1102cce24ab:04b4f7a4ae4668dbc28ba34c838a7a65cf80af03dcd102a5a32bb1a912a4a8426c7f8286ded3aedf2c6f27ed6de22e5da297a14f56409a2843d7dd589b2dd4fa', 'Acenta 2', '5555555555', 'Acenta 2', 'trial', '2026-01-08 10:06:57.734', NULL, NULL, true, false, NULL, 50, 1000, '2026-01-10 10:02:28.406', 24, NULL, 'Acenta 2 acentasi yönetiçi hesabı', '2026-01-08 10:06:57.735175', '2026-01-08 10:06:57.735175', 9, false);
INSERT INTO public.app_users VALUES (7, 'acenta', 'acenta@acenta.com', 'f7661270f1d4349e6698623c802cdfd9:d4fa5b56a0f69f52c3f6948f118d913f34da44f458cbbd9fb53f7fff480c303a0ad36c391a3e5d315639eb1484500199ba52e86b748a02fe5881fbcdd95f915c', 'Acenta 1', '5555555555', 'acenta', 'professional', '2026-01-06 07:11:00.946', '2026-02-05 07:11:00.946', NULL, true, false, NULL, 50, 1000, '2026-01-10 11:29:26.333', 47, NULL, 'acenta acentasi yönetiçi hesabı', '2026-01-06 07:11:00.948427', '2026-01-08 09:44:58.802', 7, false);


--
-- Data for Name: app_versions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: auto_responses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.auto_responses VALUES (11, 'Fiyat Bilgisi', '["fiyat","ücret","ne kadar","kaç para","kaç tl","ucuz","pahalı"]', 'Fiyat bilgisi için lütfen aktivite sayfamızı ziyaret edin veya temsilcimizle görüşmek için bekleyin.', 10, true, '2026-01-06 07:11:00.96175', '["price","cost","how much","fee","rate"]', 'For pricing information, please visit our activity page or wait to speak with our representative.', 7);
INSERT INTO public.auto_responses VALUES (12, 'Rezervasyon Durumu', '["rezervasyon","booking","kayıt","yer ayırtma","randevu"]', 'Rezervasyon durumunuzu kontrol etmek için rezervasyon numaranızı paylaşabilir misiniz?', 9, true, '2026-01-06 07:11:00.965283', '["reservation","booking","appointment","schedule"]', 'To check your reservation status, could you please share your reservation number?', 7);
INSERT INTO public.auto_responses VALUES (13, 'İptal/Değişiklik', '["iptal","değişiklik","tarih değiştir","saat değiştir","erteleme"]', 'Rezervasyon iptali veya değişikliği için lütfen rezervasyon numaranızı ve talebinizi belirtin. Temsilcimiz en kısa sürede size dönüş yapacaktır.', 8, true, '2026-01-06 07:11:00.971845', '["cancel","change","reschedule","modify","postpone"]', 'For cancellation or modification, please provide your reservation number and request. Our representative will get back to you shortly.', 7);
INSERT INTO public.auto_responses VALUES (14, 'Çalışma Saatleri', '["saat","çalışma saati","açık mı","kapalı mı","ne zaman"]', 'Çalışma saatlerimiz hakkında bilgi almak için web sitemizi ziyaret edebilir veya mesai saatleri içinde bizi arayabilirsiniz.', 5, true, '2026-01-06 07:11:00.974623', '["hours","open","closed","when","time"]', 'For our working hours, please visit our website or call us during business hours.', 7);
INSERT INTO public.auto_responses VALUES (15, 'Selamlama', '["merhaba","selam","günaydın","iyi günler","iyi akşamlar"]', 'Merhaba! Size nasıl yardımcı olabiliriz?', 1, true, '2026-01-06 07:11:00.978811', '["hello","hi","good morning","good evening","hey"]', 'Hello! How can we help you?', 7);
INSERT INTO public.auto_responses VALUES (16, 'Fiyat Bilgisi', '["fiyat","ücret","ne kadar","kaç para","kaç tl","ucuz","pahalı"]', 'Fiyat bilgisi için lütfen aktivite sayfamızı ziyaret edin veya temsilcimizle görüşmek için bekleyin.', 10, true, '2026-01-08 10:06:57.749197', '["price","cost","how much","fee","rate"]', 'For pricing information, please visit our activity page or wait to speak with our representative.', 9);
INSERT INTO public.auto_responses VALUES (17, 'Rezervasyon Durumu', '["rezervasyon","booking","kayıt","yer ayırtma","randevu"]', 'Rezervasyon durumunuzu kontrol etmek için rezervasyon numaranızı paylaşabilir misiniz?', 9, true, '2026-01-08 10:06:57.752107', '["reservation","booking","appointment","schedule"]', 'To check your reservation status, could you please share your reservation number?', 9);
INSERT INTO public.auto_responses VALUES (18, 'İptal/Değişiklik', '["iptal","değişiklik","tarih değiştir","saat değiştir","erteleme"]', 'Rezervasyon iptali veya değişikliği için lütfen rezervasyon numaranızı ve talebinizi belirtin. Temsilcimiz en kısa sürede size dönüş yapacaktır.', 8, true, '2026-01-08 10:06:57.756373', '["cancel","change","reschedule","modify","postpone"]', 'For cancellation or modification, please provide your reservation number and request. Our representative will get back to you shortly.', 9);
INSERT INTO public.auto_responses VALUES (19, 'Çalışma Saatleri', '["saat","çalışma saati","açık mı","kapalı mı","ne zaman"]', 'Çalışma saatlerimiz hakkında bilgi almak için web sitemizi ziyaret edebilir veya mesai saatleri içinde bizi arayabilirsiniz.', 5, true, '2026-01-08 10:06:57.7594', '["hours","open","closed","when","time"]', 'For our working hours, please visit our website or call us during business hours.', 9);
INSERT INTO public.auto_responses VALUES (20, 'Selamlama', '["merhaba","selam","günaydın","iyi günler","iyi akşamlar"]', 'Merhaba! Size nasıl yardımcı olabiliriz?', 1, true, '2026-01-08 10:06:57.76233', '["hello","hi","good morning","good evening","hey"]', 'Hello! How can we help you?', 9);


--
-- Data for Name: blacklist; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bot_quality_scores; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: capacity; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: customer_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: daily_message_usage; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: database_backups; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.database_backups VALUES (1, 'replityedek7ocak0710', '', 'backup_2026-01-07T04-10-25-264Z.json', 32176, 17, 147, 'completed', 'manual', 'super_admin', NULL, NULL, '2026-01-07 04:10:25.347317');
INSERT INTO public.database_backups VALUES (2, 'yedek2', '', 'backup_2026-01-07T06-33-29-515Z.json', 32135, 17, 146, 'completed', 'manual', 'super_admin', NULL, NULL, '2026-01-07 06:33:29.535388');
INSERT INTO public.database_backups VALUES (3, '08 Ocak', '', 'backup_2026-01-08T11-52-28-133Z.json', 52757, 23, 200, 'completed', 'manual', 'super_admin', NULL, NULL, '2026-01-08 11:52:28.17256');
INSERT INTO public.database_backups VALUES (4, '8ocak2', '', 'backup_2026-01-08T12-32-45-989Z.json', 52757, 23, 200, 'completed', 'manual', 'super_admin', NULL, NULL, '2026-01-08 12:32:46.027295');
INSERT INTO public.database_backups VALUES (5, '8ocak2', '', 'backup_2026-01-08T12-39-31-112Z.json', 52757, 23, 200, 'completed', 'manual', 'super_admin', NULL, NULL, '2026-01-08 12:39:31.143965');
INSERT INTO public.database_backups VALUES (6, '10ocak', '', 'backup_2026-01-10T12-47-52-766Z.json', 58367, 21, 211, 'completed', 'manual', 'super_admin', NULL, NULL, '2026-01-10 12:47:52.821708');


--
-- Data for Name: dispatch_shares; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: error_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.holidays VALUES (10, 'Yılbaşı', '2026-01-01', '2026-01-01', 'official', '["yılbaşı","yeni yıl","1 ocak"]', '', true, NULL);
INSERT INTO public.holidays VALUES (11, '23 Nisan Ulusal Egemenlik ve Cocuk Bayrami', '2026-04-23', '2026-04-23', 'official', '["23 nisan","cocuk bayrami"]', '', true, NULL);
INSERT INTO public.holidays VALUES (12, '1 Mayıs Emek ve Dayanisma Gunu', '2026-05-01', '2026-05-01', 'official', '["1 mayıs","isci bayrami"]', '', true, NULL);
INSERT INTO public.holidays VALUES (13, '19 Mayıs Ataturku Anma Genclik ve Spor Bayrami', '2026-05-19', '2026-05-19', 'official', '["19 mayıs","genclik bayrami"]', '', true, NULL);
INSERT INTO public.holidays VALUES (14, '15 Temmuz Demokrasi ve Milli Birlik Gunu', '2026-07-15', '2026-07-15', 'official', '["15 temmuz"]', '', true, NULL);
INSERT INTO public.holidays VALUES (15, '30 Ağustos Zafer Bayrami', '2026-08-30', '2026-08-30', 'official', '["30 ağustos","zafer bayrami"]', '', true, NULL);
INSERT INTO public.holidays VALUES (16, '29 Ekim Cumhuriyet Bayrami', '2026-10-29', '2026-10-29', 'official', '["29 ekim","cumhuriyet bayrami"]', '', true, NULL);
INSERT INTO public.holidays VALUES (17, 'Ramazan Bayrami 2026', '2026-03-20', '2026-03-22', 'religious', '["ramazan bayrami","seker bayrami"]', '', true, NULL);
INSERT INTO public.holidays VALUES (18, 'Kurban Bayrami 2026', '2026-05-27', '2026-05-30', 'religious', '["kurban bayrami","bayram"]', '', true, NULL);


--
-- Data for Name: in_app_notifications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: license; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.license VALUES (1, '345345', 'ssd', NULL, NULL, 'trial', 'Deneme', 5, 50, 1, '[]', '2026-01-05 05:09:20.939', '2026-02-04 16:16:08.848103', true, '2026-01-06 08:17:57.071', '2026-01-05 05:09:20.950685', '2026-01-05 16:16:08.848103');


--
-- Data for Name: login_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.messages VALUES (23, '+905551112233', 'Merhaba, fiyat bilgisi alabilir miyim?', 'user', '2026-01-06 07:44:27.502455', true, 7);
INSERT INTO public.messages VALUES (24, '+905551112233', 'Fiyat bilgisi için lütfen müşteri temsilcimiz size yardımcı olacak.', 'assistant', '2026-01-06 07:45:27.502455', false, 7);
INSERT INTO public.messages VALUES (25, '+905554445566', 'Rezervasyon detaylarını öğrenmek istiyorum', 'user', '2026-01-06 07:14:27.502455', true, 7);
INSERT INTO public.messages VALUES (26, '+905554445566', 'Müşteri temsilcimiz en kısa sürede size dönecektir.', 'assistant', '2026-01-06 07:15:27.502455', false, 7);


--
-- Data for Name: package_tour_activities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.package_tour_activities VALUES (6, 2, 6, 0, '09:00', 0, NULL);
INSERT INTO public.package_tour_activities VALUES (7, 2, 7, 0, '09:00', 1, NULL);


--
-- Data for Name: package_tours; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.package_tours VALUES (2, 'Uçuş ve Dalış Paketi', '[]', '', 5000, 100, 'Sayın {isim}, paket tur rezervasyonunuz onaylanmistir. Tarih: {tarih}. Rezervasyonunuzu takip etmek için: {takip_linki} Teşekkür ederiz.', '', '', true, '2026-01-07 16:08:11.017187', '[]', NULL);


--
-- Data for Name: partner_invite_codes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.partner_invite_codes VALUES (3, 9, 'L7SQP1', true, 0, NULL, NULL, '2026-01-09 14:08:57.84914');


--
-- Data for Name: partner_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.permissions VALUES (1, 'dashboard.view', 'Dashboard Goruntule', NULL, 'dashboard', 1);
INSERT INTO public.permissions VALUES (2, 'reservations.view', 'Rezervasyonlari Goruntule', NULL, 'reservations', 1);
INSERT INTO public.permissions VALUES (3, 'reservations.create', 'Rezervasyon Olustur', NULL, 'reservations', 2);
INSERT INTO public.permissions VALUES (4, 'reservations.edit', 'Rezervasyon Duzenle', NULL, 'reservations', 3);
INSERT INTO public.permissions VALUES (5, 'reservations.delete', 'Rezervasyon Sil', NULL, 'reservations', 4);
INSERT INTO public.permissions VALUES (6, 'activities.view', 'Aktiviteleri Goruntule', NULL, 'activities', 1);
INSERT INTO public.permissions VALUES (7, 'activities.manage', 'Aktiviteleri Yonet', NULL, 'activities', 2);
INSERT INTO public.permissions VALUES (8, 'calendar.view', 'Takvimi Goruntule', NULL, 'calendar', 1);
INSERT INTO public.permissions VALUES (9, 'calendar.manage', 'Takvimi Yonet', NULL, 'calendar', 2);
INSERT INTO public.permissions VALUES (10, 'reports.view', 'Raporlari Goruntule', NULL, 'reports', 1);
INSERT INTO public.permissions VALUES (11, 'reports.export', 'Rapor Indir', NULL, 'reports', 2);
INSERT INTO public.permissions VALUES (12, 'finance.view', 'Finans Goruntule', NULL, 'finance', 1);
INSERT INTO public.permissions VALUES (13, 'finance.manage', 'Finans Yonet', NULL, 'finance', 2);
INSERT INTO public.permissions VALUES (14, 'settings.view', 'Ayarlari Goruntule', NULL, 'settings', 1);
INSERT INTO public.permissions VALUES (15, 'settings.manage', 'Ayarlari Yonet', NULL, 'settings', 2);
INSERT INTO public.permissions VALUES (16, 'users.view', 'Kullanicilari Goruntule', NULL, 'users', 1);
INSERT INTO public.permissions VALUES (17, 'users.manage', 'Kullanicilari Yonet', NULL, 'users', 2);
INSERT INTO public.permissions VALUES (18, 'whatsapp.view', 'WhatsApp Goruntule', NULL, 'whatsapp', 1);
INSERT INTO public.permissions VALUES (19, 'whatsapp.manage', 'WhatsApp Yonet', NULL, 'whatsapp', 2);
INSERT INTO public.permissions VALUES (20, 'bot.view', 'Bot Ayarlarini Goruntule', NULL, 'bot', 1);
INSERT INTO public.permissions VALUES (21, 'bot.manage', 'Bot Ayarlarini Yonet', NULL, 'bot', 2);
INSERT INTO public.permissions VALUES (22, 'agencies.view', 'Acentalari Goruntule', NULL, 'agencies', 1);
INSERT INTO public.permissions VALUES (23, 'agencies.manage', 'Acentalari Yonet', NULL, 'agencies', 2);
INSERT INTO public.permissions VALUES (24, 'subscription.view', 'Abonelik Goruntule', NULL, 'subscription', 1);
INSERT INTO public.permissions VALUES (25, 'subscription.manage', 'Abonelik Yonet', NULL, 'subscription', 2);
INSERT INTO public.permissions VALUES (26, 'capacity.view', 'Kapasite Goruntule', 'Musaitlik ve kapasite bilgilerini goruntuleme', 'capacity', 1);
INSERT INTO public.permissions VALUES (27, 'reservations.request', 'Rezervasyon Talebi Olustur', 'Onay gerektiren rezervasyon talebi olusturma', 'reservations', 5);
INSERT INTO public.permissions VALUES (28, 'settings.templates.manage', 'Mesaj Şablonlarini Yönet', NULL, 'settings', 3);


--
-- Data for Name: plan_features; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.plan_features VALUES (1, 'basic_calendar', 'Temel Takvim', 'Rezervasyon takvimi görüntüleme', 'Calendar', 'core', 0, true, '2026-01-05 06:49:07.883141');
INSERT INTO public.plan_features VALUES (2, 'manual_reservations', 'Manuel Rezervasyon', 'Manuel rezervasyon oluşturma', 'ClipboardList', 'core', 1, true, '2026-01-05 06:49:07.898385');
INSERT INTO public.plan_features VALUES (3, 'whatsapp_notifications', 'WhatsApp Bildirimleri', 'WhatsApp üzerinden bildirim gönderme', 'MessageCircle', 'communication', 2, true, '2026-01-05 06:49:07.902119');
INSERT INTO public.plan_features VALUES (4, 'basic_reports', 'Temel Raporlar', 'Basit istatistik raporları', 'BarChart3', 'analytics', 3, true, '2026-01-05 06:49:07.905623');
INSERT INTO public.plan_features VALUES (5, 'advanced_reports', 'Gelişmiş Raporlar', 'Detaylı analiz ve raporlama', 'TrendingUp', 'analytics', 4, true, '2026-01-05 06:49:07.909743');
INSERT INTO public.plan_features VALUES (6, 'ai_bot', 'AI Bot', 'Yapay zeka destekli müşteri yanıtları', 'Bot', 'automation', 5, true, '2026-01-05 06:49:07.913614');
INSERT INTO public.plan_features VALUES (7, 'woocommerce', 'WooCommerce Entegrasyonu', 'E-ticaret sitesi entegrasyonu', 'ShoppingCart', 'integration', 6, true, '2026-01-05 06:49:07.918828');
INSERT INTO public.plan_features VALUES (8, 'package_tours', 'Paket Turlar', 'Çoklu aktivite paket turları', 'Package', 'core', 7, true, '2026-01-05 06:49:07.923034');
INSERT INTO public.plan_features VALUES (9, 'api_access', 'API Erişimi', 'Dış sistemler için API erişimi', 'Code', 'integration', 8, true, '2026-01-05 06:49:07.927615');
INSERT INTO public.plan_features VALUES (10, 'priority_support', 'Öncelikli Destek', '7/24 öncelikli teknik destek', 'HeadphonesIcon', 'support', 9, true, '2026-01-05 06:49:07.931982');
INSERT INTO public.plan_features VALUES (11, 'custom_branding', 'Özel Marka', 'Kendi logonuz ve renk temanız', 'Palette', 'customization', 10, true, '2026-01-05 06:49:07.939027');


--
-- Data for Name: platform_admins; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.platform_admins VALUES (2, 'flymet.mail@gmail.com', 'c8c23521eafd676ab201c93c0bd055ff:f5954c5d8274c257d5b4041320ff764cd7f2b0e5776c38c6e849482fb4365bf4a2b6e6e5bd336a4cea69bd49f5187107e9123254b8ef7a6448de54c4dc067514', 'flymet', 'super_admin', true, NULL, '2026-01-05 14:20:55.297094', '2026-01-05 14:20:55.297094');


--
-- Data for Name: platform_support_tickets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: request_message_templates; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.request_message_templates VALUES (10, 'Talep Onaylandı', 'approved', 'Sayın {customerName}, {requestType} talebiniz onaylanmıştır. Teşekkür ederiz.', false, true, '2026-01-06 07:11:00.982214', 7);
INSERT INTO public.request_message_templates VALUES (11, 'Talep Değerlendiriliyor', 'pending', 'Sayın {customerName}, {requestType} talebiniz değerlendirilmektedir. En kısa sürede size dönüş yapacağız.', false, true, '2026-01-06 07:11:00.985574', 7);
INSERT INTO public.request_message_templates VALUES (12, 'Talep Reddedildi', 'rejected', 'Sayın {customerName}, üzgünüz ancak {requestType} talebinizi karşılayamıyoruz. Detaylar için bizimle iletişime geçebilirsiniz.', false, true, '2026-01-06 07:11:00.989155', 7);
INSERT INTO public.request_message_templates VALUES (13, 'Talep Onaylandı', 'approved', 'Sayın {customerName}, {requestType} talebiniz onaylanmıştır. Teşekkür ederiz.', false, true, '2026-01-08 10:06:57.765779', 9);
INSERT INTO public.request_message_templates VALUES (14, 'Talep Değerlendiriliyor', 'pending', 'Sayın {customerName}, {requestType} talebiniz değerlendirilmektedir. En kısa sürede size dönüş yapacağız.', false, true, '2026-01-08 10:06:57.770514', 9);
INSERT INTO public.request_message_templates VALUES (15, 'Talep Reddedildi', 'rejected', 'Sayın {customerName}, üzgünüz ancak {requestType} talebinizi karşılayamıyoruz. Detaylar için bizimle iletişime geçebilirsiniz.', false, true, '2026-01-08 10:06:57.774154', 9);


--
-- Data for Name: reservation_change_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: reservation_requests; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.reservation_requests VALUES (11, 7, 8, '2026-01-10', '13:00', 'tasfdasdd', '3242332', 5, '[Partner: Acenta 2]', 'deleted', 10, 10, '2026-01-10 08:13:37.523', NULL, NULL, '2026-01-10 07:45:24.866786', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (45, 7, 8, '2026-01-10', '09:00', 'gger', '23423423', 1, '[Partner: Acenta 2]', 'deleted', 10, 10, '2026-01-10 08:13:33.151', NULL, NULL, '2026-01-10 08:07:06.042614', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (44, 7, 8, '2026-01-10', '17:00', 'test55', '323432234', 1, '[Partner: Acenta 2]', 'deleted', 10, 10, '2026-01-10 08:13:34.995', NULL, NULL, '2026-01-10 08:06:36.166854', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (9, 7, 8, '2026-01-08', '17:00', 'asfdasd', '32423', 2, '[Partner: Acenta 2]', 'rejected', 10, 7, '2026-01-10 07:04:50.787', NULL, NULL, '2026-01-10 04:23:50.668149', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (1, 7, 7, '2026-01-28', '09:00', 'deneme', '51512627618', 1, 'asfas', 'rejected', 9, 7, '2026-01-10 07:10:20.126', NULL, NULL, '2026-01-07 07:20:34.510325', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (47, 9, 9, '2026-01-10', '09:00', 'tttt', '555555', 1, '[Partner: acenta]', 'deleted', 7, 7, '2026-01-10 10:02:01.865', NULL, 59, '2026-01-10 08:14:37.682313', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (48, 9, 9, '2026-01-11', '09:00', 'rrr', '55555', 1, '[Partner: acenta]', 'deleted', 7, 7, '2026-01-10 10:02:03.386', NULL, 58, '2026-01-10 08:15:16.777533', 'sender_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (49, 9, 9, '2026-01-09', '09:00', 'eeeee', '55555', 1, '[Partner: acenta]', 'deleted', 7, 7, '2026-01-10 10:02:05.367', NULL, 57, '2026-01-10 08:15:40.362713', 'sender_partial', 500, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (4, 7, 8, '2026-01-15', '17:00', 'Hasan Hüseyin', '51512627618', 3, '[Partner: Acenta 2]', 'deleted', 10, 7, '2026-01-10 04:21:24.885', NULL, NULL, '2026-01-08 11:00:34.366603', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (3, 7, 8, '2026-01-09', '13:00', 'Test Ahmet 2', '51512627618', 2, '[Partner: Acenta 2] testt', 'deleted', 10, 7, '2026-01-08 10:22:15.073', 'Ödemesi bizde', NULL, '2026-01-08 10:21:29.960484', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (2, 7, 7, '2026-01-07', '09:00', 'deneme', '34324', 2, 'fsdfsf', 'deleted', 9, 7, '2026-01-07 08:03:55.228', NULL, NULL, '2026-01-07 07:40:50.355087', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (6, 9, 9, '2026-01-09', '09:00', 'Hamza Mert', '234234234234', 5, '[Partner: acenta] hsşkmfşea', 'deleted', 7, 10, '2026-01-09 16:24:04.241', NULL, NULL, '2026-01-09 14:37:32.238792', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (7, 9, 9, '2026-01-08', '09:00', 'gasdfasd', '223423', 2, '[Partner: acenta] asdas', 'deleted', 7, 10, '2026-01-10 06:16:59.161', NULL, NULL, '2026-01-09 14:42:15.817456', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (8, 9, 9, '2026-01-10', '09:00', 'Hamza Mamza', '23423423', 5, '[Partner: acenta] dgfdsds', 'deleted', 7, 7, '2026-01-10 07:32:16.108', NULL, NULL, '2026-01-09 15:54:07.257036', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (5, 7, 8, '2026-01-08', '13:00', 'Salih Demir', '55555555555', 3, '[Partner: Acenta 2]', 'deleted', 10, 10, '2026-01-10 07:32:45.449', NULL, NULL, '2026-01-09 06:34:06.333097', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (10, 7, 8, '2026-01-05', '13:00', 'Test', '2334242', 2, '[Partner: Acenta 2]', 'deleted', 10, 10, '2026-01-10 07:44:39.139', NULL, 21, '2026-01-10 07:33:13.718231', 'receiver_full', 0, 'TRY', NULL);
INSERT INTO public.reservation_requests VALUES (46, 9, 9, '2026-01-08', '09:00', 'tessst6', '5555555', 1, '[Partner: acenta]', 'rejected', 7, 10, '2026-01-10 08:13:26.519', NULL, NULL, '2026-01-10 08:10:08.896286', 'receiver_full', 0, 'TRY', NULL);


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.reservations VALUES (57, 9, 'eeeee', '55555', NULL, '2026-01-09', '09:00', 1, 'pending', 'partner', NULL, '2026-01-10 08:15:55.157341', 0, 0, 'TRY', NULL, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 9, 'unpaid', '[Partner: acenta]');
INSERT INTO public.reservations VALUES (58, 9, 'rrr', '55555', NULL, '2026-01-11', '09:00', 1, 'pending', 'partner', NULL, '2026-01-10 08:15:57.421796', 0, 0, 'TRY', NULL, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 9, 'unpaid', '[Partner: acenta]');
INSERT INTO public.reservations VALUES (59, 9, 'tttt', '555555', NULL, '2026-01-10', '09:00', 1, 'pending', 'partner', NULL, '2026-01-10 08:15:59.099835', 0, 0, 'TRY', NULL, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 9, 'unpaid', '[Partner: acenta]');
INSERT INTO public.reservations VALUES (21, 8, 'Test', '2334242', NULL, '2026-01-05', '13:00', 2, 'pending', 'partner', NULL, '2026-01-10 07:34:51.149411', 0, 0, 'TRY', NULL, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 7, 'unpaid', NULL);


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.role_permissions VALUES (1, 4, 1);
INSERT INTO public.role_permissions VALUES (2, 4, 2);
INSERT INTO public.role_permissions VALUES (3, 4, 3);
INSERT INTO public.role_permissions VALUES (4, 4, 4);
INSERT INTO public.role_permissions VALUES (5, 4, 5);
INSERT INTO public.role_permissions VALUES (6, 4, 6);
INSERT INTO public.role_permissions VALUES (7, 4, 7);
INSERT INTO public.role_permissions VALUES (8, 4, 8);
INSERT INTO public.role_permissions VALUES (9, 4, 9);
INSERT INTO public.role_permissions VALUES (10, 4, 10);
INSERT INTO public.role_permissions VALUES (11, 4, 11);
INSERT INTO public.role_permissions VALUES (12, 4, 12);
INSERT INTO public.role_permissions VALUES (13, 4, 13);
INSERT INTO public.role_permissions VALUES (14, 4, 14);
INSERT INTO public.role_permissions VALUES (15, 4, 15);
INSERT INTO public.role_permissions VALUES (16, 4, 16);
INSERT INTO public.role_permissions VALUES (17, 4, 17);
INSERT INTO public.role_permissions VALUES (18, 4, 18);
INSERT INTO public.role_permissions VALUES (19, 4, 19);
INSERT INTO public.role_permissions VALUES (20, 4, 20);
INSERT INTO public.role_permissions VALUES (21, 4, 21);
INSERT INTO public.role_permissions VALUES (22, 4, 22);
INSERT INTO public.role_permissions VALUES (23, 4, 23);
INSERT INTO public.role_permissions VALUES (24, 4, 24);
INSERT INTO public.role_permissions VALUES (25, 4, 25);
INSERT INTO public.role_permissions VALUES (26, 5, 1);
INSERT INTO public.role_permissions VALUES (27, 5, 2);
INSERT INTO public.role_permissions VALUES (28, 5, 3);
INSERT INTO public.role_permissions VALUES (29, 5, 4);
INSERT INTO public.role_permissions VALUES (30, 5, 5);
INSERT INTO public.role_permissions VALUES (31, 5, 6);
INSERT INTO public.role_permissions VALUES (32, 5, 7);
INSERT INTO public.role_permissions VALUES (33, 5, 8);
INSERT INTO public.role_permissions VALUES (34, 5, 9);
INSERT INTO public.role_permissions VALUES (35, 5, 10);
INSERT INTO public.role_permissions VALUES (36, 5, 11);
INSERT INTO public.role_permissions VALUES (37, 5, 12);
INSERT INTO public.role_permissions VALUES (38, 5, 13);
INSERT INTO public.role_permissions VALUES (39, 5, 14);
INSERT INTO public.role_permissions VALUES (40, 5, 16);
INSERT INTO public.role_permissions VALUES (41, 5, 17);
INSERT INTO public.role_permissions VALUES (42, 5, 18);
INSERT INTO public.role_permissions VALUES (43, 5, 19);
INSERT INTO public.role_permissions VALUES (44, 5, 20);
INSERT INTO public.role_permissions VALUES (45, 5, 21);
INSERT INTO public.role_permissions VALUES (46, 5, 22);
INSERT INTO public.role_permissions VALUES (47, 5, 23);
INSERT INTO public.role_permissions VALUES (48, 6, 1);
INSERT INTO public.role_permissions VALUES (49, 6, 2);
INSERT INTO public.role_permissions VALUES (50, 6, 3);
INSERT INTO public.role_permissions VALUES (51, 6, 4);
INSERT INTO public.role_permissions VALUES (52, 6, 6);
INSERT INTO public.role_permissions VALUES (53, 6, 8);
INSERT INTO public.role_permissions VALUES (54, 6, 10);
INSERT INTO public.role_permissions VALUES (55, 6, 18);
INSERT INTO public.role_permissions VALUES (56, 3, 26);
INSERT INTO public.role_permissions VALUES (58, 4, 26);
INSERT INTO public.role_permissions VALUES (59, 5, 26);
INSERT INTO public.role_permissions VALUES (60, 6, 26);
INSERT INTO public.role_permissions VALUES (61, 3, 27);
INSERT INTO public.role_permissions VALUES (62, 4, 28);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles VALUES (1, 'admin', 'Yonetici', 'Tam yetkili yonetici', 'red', true, true, '2026-01-05 10:44:10.305619', '2026-01-05 10:44:10.305619');
INSERT INTO public.roles VALUES (2, 'operator', 'Operator', 'Rezervasyon ve aktivite islemleri', 'blue', true, true, '2026-01-05 10:44:10.312402', '2026-01-05 10:44:10.312402');
INSERT INTO public.roles VALUES (4, 'tenant_owner', 'Sahip', 'Acenta sahibi - tam yetki (ayarlar, faturalar, kullanici yonetimi)', 'purple', true, true, '2026-01-05 12:57:49.159391', '2026-01-05 12:57:49.159391');
INSERT INTO public.roles VALUES (5, 'tenant_manager', 'Yonetici', 'Operasyonel yonetici - aktiviteler, bot, finans, rezervasyonlar', 'blue', true, true, '2026-01-05 12:57:49.343008', '2026-01-05 12:57:49.343008');
INSERT INTO public.roles VALUES (6, 'tenant_operator', 'Operator', 'Gunluk islemler - rezervasyon ve mesajlar', 'green', true, true, '2026-01-05 12:57:49.606', '2026-01-05 12:57:49.606');
INSERT INTO public.roles VALUES (3, 'viewer', 'Is Ortagi', 'Partner acenta erisimi', 'gray', true, true, '2026-01-05 10:44:10.316484', '2026-01-05 10:44:10.316484');


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.session VALUES ('t0hSiLKyWXZt5WPcj0dI4pi-bseoBbC2', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-01-17T11:29:26.356Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"tenantId":7,"username":"acenta","roles":[4],"permissions":["activities.view","activities.manage","agencies.view","agencies.manage","bot.view","bot.manage","calendar.view","calendar.manage","capacity.view","dashboard.view","finance.view","finance.manage","reports.view","reports.export","reservations.view","reservations.create","reservations.edit","reservations.delete","settings.view","settings.manage","settings.templates.manage","subscription.view","subscription.manage","users.view","users.manage","whatsapp.view","whatsapp.manage"],"platformAdminId":2,"isPlatformAdmin":true}', '2026-01-18 10:33:02');


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.settings VALUES (24, 'reminderMessage', 'Merhaba {isim}! Rezervasyonunuz için hatırlatma:

{aktiviteler}
Tarih: {tarih}

Sizi görmek için sabırsızlanıyoruz!', NULL);
INSERT INTO public.settings VALUES (25, 'bot_rules', '', NULL);
INSERT INTO public.settings VALUES (26, 'reminderHours', '24', NULL);
INSERT INTO public.settings VALUES (27, 'botAccess', '{"enabled":true,"activities":true,"packageTours":true,"capacity":true,"faq":true,"confirmation":true,"transfer":true,"extras":true}', NULL);
INSERT INTO public.settings VALUES (28, 'bulkMessageTemplates', '{"confirmed":{"label":"Onaylandı","content":"Merhaba {isim},\n\nRezervasyon onaylandı!\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nİyi günler dileriz."},"pending":{"label":"Beklemede","content":"Merhaba {isim},\n\nRezervasyon talebiniz değerlendiriliyor.\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nEn kısa sürede bilgilendirme yapılacaktır."},"cancelled":{"label":"İptal","content":"Merhaba {isim},\n\nÜzgünüz, rezervasyonunuz iptal edilmiştir.\nAktivite: {aktivite}\nTarih: {tarih}\n\nDetaylar için: {takip_linki}\n\nSorularınız için bizimle iletişime geçebilirsiniz."}}', NULL);
INSERT INTO public.settings VALUES (19, 'botRules', '=== BOT KURALLARI (13 MADDE) ===

1. Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.

2. MÜSAİTLİK/KONTENJAN sorularında yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ''ndeki yarın tarihini kullan.

3. Eğer müsaitlik bilgisi yoksa müşteriye "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.

4. ESKALASYON: Karmaşık konularda, şikayetlerde, veya 2 mesaj içinde çözülemeyen sorunlarda "Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir" de. Müşteri memnuniyetsiz/agresifse veya "destek talebi", "operatör", "beni arayın" gibi ifadeler kullanırsa da aynı şekilde yönlendir.

5. Fiyat indirimi, grup indirimi gibi özel taleplerde yetkili yönlendirmesi yap.

6. Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.

7. TRANSFER soruları: Yukarıdaki aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.

8. EKSTRA HİZMET soruları: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda yukarıdaki "Ekstra Hizmetler" listesini kullan ve fiyatları ver.

9. PAKET TUR soruları: Müşteri birden fazla aktivite içeren paket turlar hakkında soru sorarsa yukarıdaki PAKET TURLAR bölümünü kullan ve bilgi ver.

10. SIK SORULAN SORULAR: Her aktivite veya paket tur için tanımlı "Sık Sorulan Sorular" bölümünü kontrol et. Müşterinin sorusu bu SSS''lerden biriyle eşleşiyorsa, oradaki cevabı kullan.

11. SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa ve onay mesajı isterse, yukarıdaki "Türkçe Sipariş Onay Mesajı" alanını kullan. Mesajı olduğu gibi, hiçbir değişiklik yapmadan ilet.

12. DEĞİŞİKLİK TALEPLERİ: Saat/tarih değişikliği veya iptal isteyenlere, kendilerine gönderilen takip linkinden taleplerini oluşturabileceklerini söyle. Takip linki yoksa sipariş numarası ile yeni link gönderilebileceğini belirt.

13. REZERVASYON LİNKİ SEÇİMİ: Müşteriyle İngilizce konuşuyorsan "EN Reservation Link" kullan. İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder (fallback). Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan.', 7);
INSERT INTO public.settings VALUES (20, 'botPrompt', 'Sen acenta bünyesinde görev yapan, profesyonel bir müşteri danışmanısın. Temel görevin; turizm aktiviteleri için rezervasyon almak, müsaitlik sorgulamak ve müşteri sorularını kurumsal bir dille yanıtlamaktır. Kendini asla bir yapay zeka olarak tanıtma; her zaman profesyonel bir çalışan rolünde kal.', 7);
INSERT INTO public.settings VALUES (21, 'botAccess', '{"enabled":true,"activities":true,"packageTours":true,"capacity":true,"faq":true,"confirmation":true,"transfer":true,"extras":true}', 7);
INSERT INTO public.settings VALUES (29, 'botRules', '=== BOT KURALLARI (13 MADDE) ===

1. Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.

2. MÜSAİTLİK/KONTENJAN sorularında yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ''ndeki yarın tarihini kullan.

3. Eğer müsaitlik bilgisi yoksa müşteriye "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.

4. ESKALASYON: Karmaşık konularda, şikayetlerde, veya 2 mesaj içinde çözülemeyen sorunlarda "Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir" de. Müşteri memnuniyetsiz/agresifse veya "destek talebi", "operatör", "beni arayın" gibi ifadeler kullanırsa da aynı şekilde yönlendir.

5. Fiyat indirimi, grup indirimi gibi özel taleplerde yetkili yönlendirmesi yap.

6. Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.

7. TRANSFER soruları: Yukarıdaki aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.

8. EKSTRA HİZMET soruları: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda yukarıdaki "Ekstra Hizmetler" listesini kullan ve fiyatları ver.

9. PAKET TUR soruları: Müşteri birden fazla aktivite içeren paket turlar hakkında soru sorarsa yukarıdaki PAKET TURLAR bölümünü kullan ve bilgi ver.

10. SIK SORULAN SORULAR: Her aktivite veya paket tur için tanımlı "Sık Sorulan Sorular" bölümünü kontrol et. Müşterinin sorusu bu SSS''lerden biriyle eşleşiyorsa, oradaki cevabı kullan.

11. SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa ve onay mesajı isterse, yukarıdaki "Türkçe Sipariş Onay Mesajı" alanını kullan. Mesajı olduğu gibi, hiçbir değişiklik yapmadan ilet.

12. DEĞİŞİKLİK TALEPLERİ: Saat/tarih değişikliği veya iptal isteyenlere, kendilerine gönderilen takip linkinden taleplerini oluşturabileceklerini söyle. Takip linki yoksa sipariş numarası ile yeni link gönderilebileceğini belirt.

13. REZERVASYON LİNKİ SEÇİMİ: Müşteriyle İngilizce konuşuyorsan "EN Reservation Link" kullan. İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder (fallback). Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan.', 2);
INSERT INTO public.settings VALUES (22, 'botPrompt', 'Sen bir TURİZM RESERVASYONLARI DANIŞMANI''sın. Müşterilerle Türkçe konuşarak rezervasyon yardımcılığı yap. Kibar, samimi ve profesyonel ol. Müşterinin sorularına hızla cevap ver ve rezervasyon yapmalarına yardımcı ol.', NULL);
INSERT INTO public.settings VALUES (23, 'customerSupportEmail', '', NULL);
INSERT INTO public.settings VALUES (30, 'botRules', '=== BOT KURALLARI (13 MADDE) ===

1. Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.

2. MÜSAİTLİK/KONTENJAN sorularında yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ''ndeki yarın tarihini kullan.

3. Eğer müsaitlik bilgisi yoksa müşteriye "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.

4. ESKALASYON: Karmaşık konularda, şikayetlerde, veya 2 mesaj içinde çözülemeyen sorunlarda "Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir" de. Müşteri memnuniyetsiz/agresifse veya "destek talebi", "operatör", "beni arayın" gibi ifadeler kullanırsa da aynı şekilde yönlendir.

5. Fiyat indirimi, grup indirimi gibi özel taleplerde yetkili yönlendirmesi yap.

6. Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.

7. TRANSFER soruları: Yukarıdaki aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.

8. EKSTRA HİZMET soruları: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda yukarıdaki "Ekstra Hizmetler" listesini kullan ve fiyatları ver.

9. PAKET TUR soruları: Müşteri birden fazla aktivite içeren paket turlar hakkında soru sorarsa yukarıdaki PAKET TURLAR bölümünü kullan ve bilgi ver.

10. SIK SORULAN SORULAR: Her aktivite veya paket tur için tanımlı "Sık Sorulan Sorular" bölümünü kontrol et. Müşterinin sorusu bu SSS''lerden biriyle eşleşiyorsa, oradaki cevabı kullan.

11. SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa ve onay mesajı isterse, yukarıdaki "Türkçe Sipariş Onay Mesajı" alanını kullan. Mesajı olduğu gibi, hiçbir değişiklik yapmadan ilet.

12. DEĞİŞİKLİK TALEPLERİ: Saat/tarih değişikliği veya iptal isteyenlere, kendilerine gönderilen takip linkinden taleplerini oluşturabileceklerini söyle. Takip linki yoksa sipariş numarası ile yeni link gönderilebileceğini belirt.

13. REZERVASYON LİNKİ SEÇİMİ: Müşteriyle İngilizce konuşuyorsan "EN Reservation Link" kullan. İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder (fallback). Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan.', 8);
INSERT INTO public.settings VALUES (12, 'botRulesSessionToken', '{"token":"7b07599276461b788ded8b6f06e711f6016d77abf18f17549a29a1d6c20e579d","expiresAt":1768135661261}', NULL);
INSERT INTO public.settings VALUES (31, 'botRules', '
=== BOT KURALLARI (13 MADDE) ===

1. Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.

2. MÜSAİTLİK/KONTENJAN sorularında yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ''ndeki yarın tarihini kullan.

3. Eğer müsaitlik bilgisi yoksa müşteriye "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.

4. ESKALASYON: Karmaşık konularda, şikayetlerde, veya 2 mesaj içinde çözülemeyen sorunlarda "Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir" de. Müşteri memnuniyetsiz/agresifse veya "destek talebi", "operatör", "beni arayın" gibi ifadeler kullanırsa da aynı şekilde yönlendir.

5. Fiyat indirimi, grup indirimi gibi özel taleplerde yetkili yönlendirmesi yap.

6. Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.

7. TRANSFER soruları: Yukarıdaki aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.

8. EKSTRA HİZMET soruları: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda yukarıdaki "Ekstra Hizmetler" listesini kullan ve fiyatları ver.

9. PAKET TUR soruları: Müşteri birden fazla aktivite içeren paket turlar hakkında soru sorarsa yukarıdaki PAKET TURLAR bölümünü kullan ve bilgi ver.

10. SIK SORULAN SORULAR: Her aktivite veya paket tur için tanımlı "Sık Sorulan Sorular" bölümünü kontrol et. Müşterinin sorusu bu SSS''lerden biriyle eşleşiyorsa, oradaki cevabı kullan.

11. SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa ve onay mesajı isterse, yukarıdaki "Türkçe Sipariş Onay Mesajı" alanını kullan. Mesajı olduğu gibi, hiçbir değişiklik yapmadan ilet.

12. DEĞİŞİKLİK TALEPLERİ: Saat/tarih değişikliği veya iptal isteyenlere, kendilerine gönderilen takip linkinden taleplerini oluşturabileceklerini söyle. Takip linki yoksa sipariş numarası ile yeni link gönderilebileceğini belirt.

13. REZERVASYON LİNKİ SEÇİMİ: Müşteriyle İngilizce konuşuyorsan "EN Reservation Link" kullan. İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder (fallback). Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan.
', 9);
INSERT INTO public.settings VALUES (32, 'botPrompt', 'Sen Acenta 2 bünyesinde görev yapan, profesyonel bir müşteri danışmanısın. Temel görevin; turizm aktiviteleri için rezervasyon almak, müsaitlik sorgulamak ve müşteri sorularını kurumsal bir dille yanıtlamaktır. Kendini asla bir yapay zeka olarak tanıtma; her zaman profesyonel bir çalışan rolünde kal.', 9);
INSERT INTO public.settings VALUES (33, 'botAccess', '{"enabled":true,"activities":true,"packageTours":true,"capacity":true,"faq":true,"confirmation":true,"transfer":true,"extras":true}', 9);
INSERT INTO public.settings VALUES (34, 'brandSettings', '{"primaryColor":"#673DE7","accentColor":"#CCFF00","companyName":"Smartur","logoUrl":"https://logobudur.com/wp-content/uploads/2026/01/smarturfavicon.png"}', 7);
INSERT INTO public.settings VALUES (35, 'popupAppearance', '{"backgroundColor":"#e0e0e0","backgroundOpacity":32,"borderColor":"#ffffff","borderOpacity":35,"blurIntensity":"medium"}', 7);


--
-- Data for Name: settlement_entries; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: subscription_payments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.subscription_plans VALUES (1, 'trial', 'Deneme', '14 günlük ücretsiz deneme', 0, 0, 0, 0, 20, 14, 3, 50, 1, 1, '["basic_calendar","manual_reservations"]', 0, true, false, '2026-01-05 05:23:25.862078', '2026-01-05 05:23:25.862078', 50, 5);
INSERT INTO public.subscription_plans VALUES (2, 'basic', 'Basic', 'Küçük işletmeler için temel paket', 99900, 2900, 959000, 27900, 20, 0, 5, 200, 2, 1, '["basic_calendar","manual_reservations","whatsapp_notifications","basic_reports"]', 1, true, false, '2026-01-05 05:23:25.882861', '2026-01-05 05:23:25.882861', 200, 20);
INSERT INTO public.subscription_plans VALUES (3, 'professional', 'Professional', 'Büyüyen işletmeler için gelişmiş özellikler', 249900, 6900, 2399000, 66300, 20, 0, 20, 1000, 5, 3, '["basic_calendar","manual_reservations","whatsapp_notifications","advanced_reports","ai_bot","woocommerce","package_tours"]', 2, true, true, '2026-01-05 05:23:25.887214', '2026-01-05 05:23:25.887214', 1000, 100);
INSERT INTO public.subscription_plans VALUES (4, 'enterprise', 'Enterprise', 'Büyük ölçekli operasyonlar için sınırsız erişim', 499900, 14900, 4799000, 143000, 20, 0, 9999, 99999, 99, 10, '["basic_calendar","manual_reservations","whatsapp_notifications","advanced_reports","ai_bot","woocommerce","package_tours","api_access","priority_support","custom_branding"]', 3, true, false, '2026-01-05 05:23:25.89116', '2026-01-05 05:23:25.89116', 10000, 9999);


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: supplier_dispatch_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: supplier_dispatches; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.supplier_dispatches VALUES (3, 8, 7, '2026-01-07', '10:00', 2, 1000, 2000, NULL, '', '2026-01-07 16:09:35.224723', NULL, NULL, 'TRY', NULL);
INSERT INTO public.supplier_dispatches VALUES (4, 8, 6, '2026-01-16', '10:00', 3, 1000, 3000, NULL, '', '2026-01-07 16:09:50.857329', NULL, NULL, 'TRY', NULL);
INSERT INTO public.supplier_dispatches VALUES (5, 8, 6, '2026-01-22', '12:00', 3, 1000, 3000, NULL, '', '2026-01-07 16:10:48.079205', NULL, NULL, 'TRY', NULL);
INSERT INTO public.supplier_dispatches VALUES (6, 8, 6, '2026-01-25', '10:00', 6, 1000, 6000, NULL, '', '2026-01-07 16:11:17.594451', NULL, NULL, 'TRY', NULL);


--
-- Data for Name: support_request_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: support_requests; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.support_requests VALUES (7, '[Soru] Test  <test@gmail.com> - sa', 'open', NULL, '2026-01-06 05:54:17.935423', NULL, NULL, NULL);
INSERT INTO public.support_requests VALUES (8, '[Soru] Test  <test@gmail.com> - php sürümü', 'open', NULL, '2026-01-06 05:54:34.570343', NULL, NULL, NULL);
INSERT INTO public.support_requests VALUES (9, '+905551112233', 'open', NULL, '2026-01-06 07:24:46.802881', NULL, 'Musteri fiyat sormak istiyor, bot cevap veremedi', 7);
INSERT INTO public.support_requests VALUES (10, '+905554445566', 'open', NULL, '2026-01-06 06:54:46.802881', NULL, 'Rezervasyon detaylari hakkinda yardim isteniyor', 7);
INSERT INTO public.support_requests VALUES (11, '+905557778899', 'in_progress', NULL, '2026-01-06 05:54:46.802881', NULL, 'Iptal talebi var, onay bekleniyor', 7);


--
-- Data for Name: system_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.system_logs VALUES (7, 'error', 'whatsapp', 'WhatsApp özel mesaj hatası', '{
  "error": "Cannot convert argument to a ByteString because the character at index 2 has a value of 351 which is greater than 255."
}', NULL, '2026-01-07 08:19:26.747559', NULL);


--
-- Data for Name: tenant_integrations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tenant_notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tenant_notification_settings VALUES (1, 7, 'reservation_new', '{whatsapp}', true, NULL, NULL, '2026-01-08 08:45:42.926');


--
-- Data for Name: tenant_partnerships; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tenant_partnerships VALUES (1, 9, 7, '5YECB1', 'active', '2026-01-08 10:07:28.796148', '2026-01-08 10:08:09.781', NULL);


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tenants VALUES (2, 'Sky Fethiye', 'sky-fethiye', 'skyfethiye@gmail.com', '05384944505', NULL, NULL, '262 83% 58%', '142 76% 36%', 'Europe/Istanbul', 'tr', true, '2026-01-05 14:51:26.747834', '2026-01-05 14:51:26.747834', 'trial');
INSERT INTO public.tenants VALUES (8, 'Default Agency', 'default', 'admin@smartur.com', NULL, NULL, NULL, '262 83% 58%', '142 76% 36%', 'Europe/Istanbul', 'tr', true, '2026-01-06 14:41:58.125027', '2026-01-06 14:41:58.125027', 'trial');
INSERT INTO public.tenants VALUES (7, 'Acenta 1', 'acenta', 'acenta@acenta.com', '5555555555', '', '', '262 83% 58%', '142 76% 36%', 'Europe/Istanbul', 'tr', true, '2026-01-06 07:11:00.929471', '2026-01-08 09:44:17.795', 'enterprise');
INSERT INTO public.tenants VALUES (9, 'Acenta 2', 'acenta-2', 'acenta2@acenta.com', '5555555555', NULL, NULL, '262 83% 58%', '142 76% 36%', 'Europe/Istanbul', 'tr', true, '2026-01-08 10:06:57.725272', '2026-01-08 10:06:57.725272', 'enterprise');


--
-- Data for Name: ticket_responses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_login_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_login_logs VALUES (3, NULL, 'flymet', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanici bulunamadi', '2026-01-05 11:40:01.24759');
INSERT INTO public.user_login_logs VALUES (5, NULL, 'skyfethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanici bulunamadi', '2026-01-05 14:52:05.944868');
INSERT INTO public.user_login_logs VALUES (6, NULL, 'Sky Fethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanici bulunamadi', '2026-01-05 14:52:20.416619');
INSERT INTO public.user_login_logs VALUES (7, 2, 'Skyfethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-05 14:57:07.084535');
INSERT INTO public.user_login_logs VALUES (8, 2, 'Skyfethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-05 15:06:00.394705');
INSERT INTO public.user_login_logs VALUES (9, 2, 'Skyfethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-05 15:15:18.727128');
INSERT INTO public.user_login_logs VALUES (10, 2, 'Skyfethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-05 15:28:31.114656');
INSERT INTO public.user_login_logs VALUES (11, 2, 'Skyfethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-05 16:12:08.726778');
INSERT INTO public.user_login_logs VALUES (12, 2, 'Skyfethiye', '172.31.101.130', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-05 16:24:25.66564');
INSERT INTO public.user_login_logs VALUES (13, 2, 'Skyfethiye', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-06 04:44:13.836414');
INSERT INTO public.user_login_logs VALUES (14, 2, 'Skyfethiye', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-06 04:55:33.758677');
INSERT INTO public.user_login_logs VALUES (15, NULL, 'test', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:57:44.155448');
INSERT INTO public.user_login_logs VALUES (16, NULL, 'testacenta', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:57:51.961763');
INSERT INTO public.user_login_logs VALUES (17, NULL, 'testacenta', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:57:53.44357');
INSERT INTO public.user_login_logs VALUES (18, NULL, 'acenta', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:57:58.382462');
INSERT INTO public.user_login_logs VALUES (19, NULL, 'test', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:58:19.718789');
INSERT INTO public.user_login_logs VALUES (20, NULL, 'test', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:58:22.374421');
INSERT INTO public.user_login_logs VALUES (21, NULL, 'test', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:58:28.791267');
INSERT INTO public.user_login_logs VALUES (22, NULL, 'Test', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:58:33.362969');
INSERT INTO public.user_login_logs VALUES (23, NULL, 'Test', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 04:58:35.047133');
INSERT INTO public.user_login_logs VALUES (25, NULL, 'Acenta', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-06 05:02:49.379655');
INSERT INTO public.user_login_logs VALUES (29, 2, 'Skyfethiye', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-06 06:55:51.062017');
INSERT INTO public.user_login_logs VALUES (30, 7, 'Acenta', '172.31.67.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-06 07:11:11.059432');
INSERT INTO public.user_login_logs VALUES (31, 7, 'acenta', '127.0.0.1', 'curl/8.14.1', 'failed', 'Yanlış şifre', '2026-01-06 10:24:42.440174');
INSERT INTO public.user_login_logs VALUES (34, 2, 'Skyfethiye', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Yanlış şifre', '2026-01-07 07:41:56.429988');
INSERT INTO public.user_login_logs VALUES (35, 2, 'skyfethiye@gmail.com', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Yanlış şifre', '2026-01-07 07:42:05.492512');
INSERT INTO public.user_login_logs VALUES (36, 7, 'Acenta', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-07 07:42:18.902628');
INSERT INTO public.user_login_logs VALUES (37, 7, 'Acenta', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-07 12:16:49.811396');
INSERT INTO public.user_login_logs VALUES (38, 7, 'Acenta', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-07 12:31:53.23931');
INSERT INTO public.user_login_logs VALUES (39, 7, 'Acenta', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-07 12:37:13.213407');
INSERT INTO public.user_login_logs VALUES (40, 7, 'Acenta', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-07 14:05:19.898512');
INSERT INTO public.user_login_logs VALUES (41, 7, 'Acenta', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-07 14:07:32.584459');
INSERT INTO public.user_login_logs VALUES (42, 7, 'Acenta', '172.31.85.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-07 14:13:06.969761');
INSERT INTO public.user_login_logs VALUES (43, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 05:14:22.086321');
INSERT INTO public.user_login_logs VALUES (44, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 08:37:46.728935');
INSERT INTO public.user_login_logs VALUES (45, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 09:44:43.705474');
INSERT INTO public.user_login_logs VALUES (46, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 09:58:51.958536');
INSERT INTO public.user_login_logs VALUES (47, 2, 'Skyfethiye', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Yanlış şifre', '2026-01-08 10:00:12.007871');
INSERT INTO public.user_login_logs VALUES (48, 2, 'skyfethiye', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Yanlış şifre', '2026-01-08 10:00:17.562801');
INSERT INTO public.user_login_logs VALUES (49, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:00:44.294398');
INSERT INTO public.user_login_logs VALUES (50, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:05:40.62504');
INSERT INTO public.user_login_logs VALUES (51, NULL, 'Acenta2', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-08 10:06:00.721654');
INSERT INTO public.user_login_logs VALUES (52, NULL, 'Acenta 2', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'failed', 'Kullanıcı bulunamadı', '2026-01-08 10:06:05.52131');
INSERT INTO public.user_login_logs VALUES (53, 10, 'Acenta2', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:07:10.287903');
INSERT INTO public.user_login_logs VALUES (54, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:07:43.713458');
INSERT INTO public.user_login_logs VALUES (55, 10, 'Acenta2', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:12:01.505019');
INSERT INTO public.user_login_logs VALUES (56, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:16:09.812507');
INSERT INTO public.user_login_logs VALUES (57, 10, 'Acenta2', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:16:41.414864');
INSERT INTO public.user_login_logs VALUES (58, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:21:41.318206');
INSERT INTO public.user_login_logs VALUES (59, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 10:54:39.163608');
INSERT INTO public.user_login_logs VALUES (60, 10, 'Acenta2', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 11:00:00.178055');
INSERT INTO public.user_login_logs VALUES (61, 7, 'Acenta', '172.31.81.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-08 11:44:26.009102');
INSERT INTO public.user_login_logs VALUES (62, 7, 'Acenta', '172.31.97.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 04:33:31.610618');
INSERT INTO public.user_login_logs VALUES (63, 7, 'Acenta', '172.31.97.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 06:06:46.570538');
INSERT INTO public.user_login_logs VALUES (64, 7, 'Acenta', '172.31.97.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 06:10:56.965842');
INSERT INTO public.user_login_logs VALUES (65, 10, 'Acenta2', '172.31.97.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 06:33:21.623438');
INSERT INTO public.user_login_logs VALUES (66, 7, 'Acenta', '172.31.97.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 06:34:17.229191');
INSERT INTO public.user_login_logs VALUES (67, 7, 'Acenta', '172.31.97.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 06:45:31.228842');
INSERT INTO public.user_login_logs VALUES (68, 7, 'Acenta', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 13:57:34.735602');
INSERT INTO public.user_login_logs VALUES (69, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:08:53.172585');
INSERT INTO public.user_login_logs VALUES (70, 7, 'Acenta', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:09:08.794879');
INSERT INTO public.user_login_logs VALUES (71, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:13:33.112714');
INSERT INTO public.user_login_logs VALUES (72, 7, 'Acenta', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:14:32.290343');
INSERT INTO public.user_login_logs VALUES (73, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:21:13.545519');
INSERT INTO public.user_login_logs VALUES (74, 7, 'Acenta', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:22:37.016968');
INSERT INTO public.user_login_logs VALUES (75, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:23:43.944194');
INSERT INTO public.user_login_logs VALUES (76, 7, 'Acenta', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:24:44.634696');
INSERT INTO public.user_login_logs VALUES (77, 7, 'Acenta', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:42:31.715133');
INSERT INTO public.user_login_logs VALUES (78, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:43:29.709024');
INSERT INTO public.user_login_logs VALUES (79, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:45:05.449376');
INSERT INTO public.user_login_logs VALUES (80, 7, 'Acenta', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 14:58:52.30324');
INSERT INTO public.user_login_logs VALUES (81, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 15:54:34.2944');
INSERT INTO public.user_login_logs VALUES (82, 10, 'Acenta2', '172.31.83.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-09 15:57:38.399245');
INSERT INTO public.user_login_logs VALUES (83, 7, 'Acenta', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 04:12:43.285769');
INSERT INTO public.user_login_logs VALUES (84, 10, 'Acenta2', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 04:23:38.179078');
INSERT INTO public.user_login_logs VALUES (85, 7, 'Acenta', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 04:24:01.741053');
INSERT INTO public.user_login_logs VALUES (86, 7, 'Acenta', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 05:24:09.253122');
INSERT INTO public.user_login_logs VALUES (87, 10, 'Acenta2', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 05:24:30.667866');
INSERT INTO public.user_login_logs VALUES (88, 7, 'Acenta', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 05:30:22.41343');
INSERT INTO public.user_login_logs VALUES (89, 10, 'Acenta2', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 06:07:35.213574');
INSERT INTO public.user_login_logs VALUES (90, 7, 'Acenta', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 06:52:27.977301');
INSERT INTO public.user_login_logs VALUES (91, 7, 'Acenta', '172.31.119.194', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 07:05:56.938841');
INSERT INTO public.user_login_logs VALUES (92, 10, 'Acenta2', '172.31.69.226', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 07:21:38.697051');
INSERT INTO public.user_login_logs VALUES (93, 7, 'Acenta', '172.31.69.226', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 07:24:46.193427');
INSERT INTO public.user_login_logs VALUES (94, 10, 'Acenta2', '172.31.69.226', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 07:32:40.958046');
INSERT INTO public.user_login_logs VALUES (95, 7, 'Acenta', '172.31.69.226', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 07:34:43.529079');
INSERT INTO public.user_login_logs VALUES (96, 10, 'Acenta2', '172.31.69.226', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 07:44:30.209531');
INSERT INTO public.user_login_logs VALUES (97, 7, 'Acenta', '172.31.69.226', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 07:45:41.321732');
INSERT INTO public.user_login_logs VALUES (129, 10, 'Acenta2', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 08:06:05.889999');
INSERT INTO public.user_login_logs VALUES (130, 7, 'Acenta', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 08:07:17.185462');
INSERT INTO public.user_login_logs VALUES (131, 10, 'Acenta2', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 08:13:11.352112');
INSERT INTO public.user_login_logs VALUES (132, 7, 'Acenta', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 08:13:58.593431');
INSERT INTO public.user_login_logs VALUES (133, 10, 'Acenta2', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 08:15:50.236666');
INSERT INTO public.user_login_logs VALUES (134, 7, 'Acenta', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 08:25:48.36406');
INSERT INTO public.user_login_logs VALUES (135, 10, 'Acenta2', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 08:48:23.512676');
INSERT INTO public.user_login_logs VALUES (136, 7, 'Acenta', '172.31.75.34', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 09:16:29.038796');
INSERT INTO public.user_login_logs VALUES (137, 7, 'Acenta', '172.31.84.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 10:01:51.334587');
INSERT INTO public.user_login_logs VALUES (138, 10, 'Acenta2', '172.31.84.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 10:02:28.371752');
INSERT INTO public.user_login_logs VALUES (139, 7, 'Acenta', '172.31.84.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 10:03:34.141141');
INSERT INTO public.user_login_logs VALUES (140, 7, 'Acenta', '172.31.84.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'success', '', '2026-01-10 11:29:26.314968');


--
-- Data for Name: user_notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_roles VALUES (2, 2, 4, NULL, '2026-01-05 14:51:26.764741');
INSERT INTO public.user_roles VALUES (9, 7, 4, NULL, '2026-01-08 10:02:20.419631');
INSERT INTO public.user_roles VALUES (10, 10, 4, NULL, '2026-01-08 10:06:57.743089');


--
-- Data for Name: viewer_activity_shares; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activities_id_seq', 9, true);


--
-- Name: activity_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_costs_id_seq', 4, true);


--
-- Name: activity_partner_shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_partner_shares_id_seq', 3, true);


--
-- Name: agencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.agencies_id_seq', 12, true);


--
-- Name: agency_activity_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.agency_activity_rates_id_seq', 2, true);


--
-- Name: agency_activity_terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.agency_activity_terms_id_seq', 1, false);


--
-- Name: agency_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.agency_notes_id_seq', 1, false);


--
-- Name: agency_payouts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.agency_payouts_id_seq', 14, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.announcements_id_seq', 2, true);


--
-- Name: api_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.api_status_logs_id_seq', 1, false);


--
-- Name: app_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.app_users_id_seq', 10, true);


--
-- Name: app_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.app_versions_id_seq', 1, false);


--
-- Name: auto_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auto_responses_id_seq', 20, true);


--
-- Name: blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blacklist_id_seq', 2, true);


--
-- Name: bot_quality_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bot_quality_scores_id_seq', 1, false);


--
-- Name: capacity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.capacity_id_seq', 8, true);


--
-- Name: customer_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_requests_id_seq', 8, true);


--
-- Name: daily_message_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_message_usage_id_seq', 1, false);


--
-- Name: database_backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.database_backups_id_seq', 6, true);


--
-- Name: dispatch_shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dispatch_shares_id_seq', 1, false);


--
-- Name: error_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.error_events_id_seq', 1, false);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.holidays_id_seq', 18, true);


--
-- Name: in_app_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.in_app_notifications_id_seq', 1, false);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.invoices_id_seq', 1, false);


--
-- Name: license_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.license_id_seq', 1, true);


--
-- Name: login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.login_logs_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 26, true);


--
-- Name: package_tour_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.package_tour_activities_id_seq', 7, true);


--
-- Name: package_tours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.package_tours_id_seq', 2, true);


--
-- Name: partner_invite_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.partner_invite_codes_id_seq', 3, true);


--
-- Name: partner_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.partner_transactions_id_seq', 44, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permissions_id_seq', 28, true);


--
-- Name: plan_features_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plan_features_id_seq', 11, true);


--
-- Name: platform_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.platform_admins_id_seq', 2, true);


--
-- Name: platform_support_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.platform_support_tickets_id_seq', 1, false);


--
-- Name: request_message_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.request_message_templates_id_seq', 15, true);


--
-- Name: reservation_change_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reservation_change_requests_id_seq', 1, false);


--
-- Name: reservation_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reservation_requests_id_seq', 49, true);


--
-- Name: reservations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reservations_id_seq', 59, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 62, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settings_id_seq', 67, true);


--
-- Name: settlement_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settlement_entries_id_seq', 1, false);


--
-- Name: settlements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settlements_id_seq', 6, true);


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscription_payments_id_seq', 1, false);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscription_plans_id_seq', 4, true);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, false);


--
-- Name: supplier_dispatch_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_dispatch_items_id_seq', 3, true);


--
-- Name: supplier_dispatches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_dispatches_id_seq', 20, true);


--
-- Name: support_request_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.support_request_logs_id_seq', 1, false);


--
-- Name: support_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.support_requests_id_seq', 60, true);


--
-- Name: system_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_logs_id_seq', 7, true);


--
-- Name: tenant_integrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tenant_integrations_id_seq', 1, false);


--
-- Name: tenant_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tenant_notification_settings_id_seq', 1, true);


--
-- Name: tenant_partnerships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tenant_partnerships_id_seq', 1, true);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tenants_id_seq', 9, true);


--
-- Name: ticket_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ticket_responses_id_seq', 1, false);


--
-- Name: user_login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_login_logs_id_seq', 140, true);


--
-- Name: user_notification_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_notification_preferences_id_seq', 1, false);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 10, true);


--
-- Name: viewer_activity_shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.viewer_activity_shares_id_seq', 1, false);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_costs activity_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_costs
    ADD CONSTRAINT activity_costs_pkey PRIMARY KEY (id);


--
-- Name: activity_partner_shares activity_partner_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_partner_shares
    ADD CONSTRAINT activity_partner_shares_pkey PRIMARY KEY (id);


--
-- Name: agencies agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: agency_activity_rates agency_activity_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_pkey PRIMARY KEY (id);


--
-- Name: agency_activity_terms agency_activity_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_pkey PRIMARY KEY (id);


--
-- Name: agency_notes agency_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_pkey PRIMARY KEY (id);


--
-- Name: agency_payouts agency_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_payouts
    ADD CONSTRAINT agency_payouts_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: api_status_logs api_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_status_logs
    ADD CONSTRAINT api_status_logs_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_email_unique UNIQUE (email);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_username_unique UNIQUE (username);


--
-- Name: app_versions app_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_versions
    ADD CONSTRAINT app_versions_pkey PRIMARY KEY (id);


--
-- Name: auto_responses auto_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_responses
    ADD CONSTRAINT auto_responses_pkey PRIMARY KEY (id);


--
-- Name: blacklist blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_pkey PRIMARY KEY (id);


--
-- Name: bot_quality_scores bot_quality_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_quality_scores
    ADD CONSTRAINT bot_quality_scores_pkey PRIMARY KEY (id);


--
-- Name: capacity capacity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity
    ADD CONSTRAINT capacity_pkey PRIMARY KEY (id);


--
-- Name: customer_requests customer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_requests
    ADD CONSTRAINT customer_requests_pkey PRIMARY KEY (id);


--
-- Name: daily_message_usage daily_message_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_message_usage
    ADD CONSTRAINT daily_message_usage_pkey PRIMARY KEY (id);


--
-- Name: database_backups database_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_backups
    ADD CONSTRAINT database_backups_pkey PRIMARY KEY (id);


--
-- Name: dispatch_shares dispatch_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares
    ADD CONSTRAINT dispatch_shares_pkey PRIMARY KEY (id);


--
-- Name: error_events error_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_events
    ADD CONSTRAINT error_events_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: in_app_notifications in_app_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: license license_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license
    ADD CONSTRAINT license_pkey PRIMARY KEY (id);


--
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: package_tour_activities package_tour_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_pkey PRIMARY KEY (id);


--
-- Name: package_tours package_tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tours
    ADD CONSTRAINT package_tours_pkey PRIMARY KEY (id);


--
-- Name: partner_invite_codes partner_invite_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_invite_codes
    ADD CONSTRAINT partner_invite_codes_code_key UNIQUE (code);


--
-- Name: partner_invite_codes partner_invite_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_invite_codes
    ADD CONSTRAINT partner_invite_codes_pkey PRIMARY KEY (id);


--
-- Name: partner_transactions partner_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_key_unique UNIQUE (key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_key_unique UNIQUE (key);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_email_unique UNIQUE (email);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: platform_support_tickets platform_support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_pkey PRIMARY KEY (id);


--
-- Name: request_message_templates request_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_message_templates
    ADD CONSTRAINT request_message_templates_pkey PRIMARY KEY (id);


--
-- Name: reservation_change_requests reservation_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_change_requests
    ADD CONSTRAINT reservation_change_requests_pkey PRIMARY KEY (id);


--
-- Name: reservation_requests reservation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: settlement_entries settlement_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: subscription_payments subscription_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_code_unique UNIQUE (code);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: supplier_dispatch_items supplier_dispatch_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatch_items
    ADD CONSTRAINT supplier_dispatch_items_pkey PRIMARY KEY (id);


--
-- Name: supplier_dispatches supplier_dispatches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_pkey PRIMARY KEY (id);


--
-- Name: support_request_logs support_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_request_logs
    ADD CONSTRAINT support_request_logs_pkey PRIMARY KEY (id);


--
-- Name: support_requests support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: tenant_integrations tenant_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_pkey PRIMARY KEY (id);


--
-- Name: tenant_integrations tenant_integrations_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_tenant_id_unique UNIQUE (tenant_id);


--
-- Name: tenant_notification_settings tenant_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_notification_settings
    ADD CONSTRAINT tenant_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_partnerships tenant_partnerships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_partnerships
    ADD CONSTRAINT tenant_partnerships_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: ticket_responses ticket_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_pkey PRIMARY KEY (id);


--
-- Name: user_login_logs user_login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: viewer_activity_shares viewer_activity_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_activity_shares
    ADD CONSTRAINT viewer_activity_shares_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: activities activities_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: activity_costs activity_costs_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_costs
    ADD CONSTRAINT activity_costs_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: activity_costs activity_costs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_costs
    ADD CONSTRAINT activity_costs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: activity_partner_shares activity_partner_shares_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_partner_shares
    ADD CONSTRAINT activity_partner_shares_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: activity_partner_shares activity_partner_shares_partnership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_partner_shares
    ADD CONSTRAINT activity_partner_shares_partnership_id_fkey FOREIGN KEY (partnership_id) REFERENCES public.tenant_partnerships(id);


--
-- Name: agencies agencies_partner_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_partner_tenant_id_fkey FOREIGN KEY (partner_tenant_id) REFERENCES public.tenants(id);


--
-- Name: agencies agencies_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_activity_rates agency_activity_rates_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: agency_activity_rates agency_activity_rates_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: agency_activity_rates agency_activity_rates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_activity_terms agency_activity_terms_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: agency_activity_terms agency_activity_terms_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: agency_activity_terms agency_activity_terms_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_notes agency_notes_admin_id_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_admin_id_platform_admins_id_fk FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id);


--
-- Name: agency_notes agency_notes_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: agency_notes agency_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_payouts agency_payouts_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_payouts
    ADD CONSTRAINT agency_payouts_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: agency_payouts agency_payouts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_payouts
    ADD CONSTRAINT agency_payouts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: app_users app_users_created_by_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_created_by_platform_admins_id_fk FOREIGN KEY (created_by) REFERENCES public.platform_admins(id);


--
-- Name: app_users app_users_plan_id_subscription_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_plan_id_subscription_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: app_users app_users_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: auto_responses auto_responses_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_responses
    ADD CONSTRAINT auto_responses_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: blacklist blacklist_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: bot_quality_scores bot_quality_scores_message_id_messages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_quality_scores
    ADD CONSTRAINT bot_quality_scores_message_id_messages_id_fk FOREIGN KEY (message_id) REFERENCES public.messages(id);


--
-- Name: bot_quality_scores bot_quality_scores_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_quality_scores
    ADD CONSTRAINT bot_quality_scores_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: capacity capacity_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity
    ADD CONSTRAINT capacity_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: capacity capacity_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity
    ADD CONSTRAINT capacity_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: customer_requests customer_requests_reservation_id_reservations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_requests
    ADD CONSTRAINT customer_requests_reservation_id_reservations_id_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: customer_requests customer_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_requests
    ADD CONSTRAINT customer_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: daily_message_usage daily_message_usage_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_message_usage
    ADD CONSTRAINT daily_message_usage_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: dispatch_shares dispatch_shares_dispatch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares
    ADD CONSTRAINT dispatch_shares_dispatch_id_fkey FOREIGN KEY (dispatch_id) REFERENCES public.supplier_dispatches(id);


--
-- Name: dispatch_shares dispatch_shares_linked_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares
    ADD CONSTRAINT dispatch_shares_linked_reservation_id_fkey FOREIGN KEY (linked_reservation_id) REFERENCES public.reservations(id);


--
-- Name: dispatch_shares dispatch_shares_partnership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares
    ADD CONSTRAINT dispatch_shares_partnership_id_fkey FOREIGN KEY (partnership_id) REFERENCES public.tenant_partnerships(id);


--
-- Name: dispatch_shares dispatch_shares_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares
    ADD CONSTRAINT dispatch_shares_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.app_users(id);


--
-- Name: dispatch_shares dispatch_shares_receiver_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares
    ADD CONSTRAINT dispatch_shares_receiver_tenant_id_fkey FOREIGN KEY (receiver_tenant_id) REFERENCES public.tenants(id);


--
-- Name: dispatch_shares dispatch_shares_sender_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_shares
    ADD CONSTRAINT dispatch_shares_sender_tenant_id_fkey FOREIGN KEY (sender_tenant_id) REFERENCES public.tenants(id);


--
-- Name: error_events error_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_events
    ADD CONSTRAINT error_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: holidays holidays_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: in_app_notifications in_app_notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: in_app_notifications in_app_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: invoices invoices_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: invoices invoices_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: invoices invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: login_logs login_logs_admin_id_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_admin_id_platform_admins_id_fk FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id);


--
-- Name: messages messages_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: package_tour_activities package_tour_activities_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: package_tour_activities package_tour_activities_package_tour_id_package_tours_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_package_tour_id_package_tours_id_fk FOREIGN KEY (package_tour_id) REFERENCES public.package_tours(id);


--
-- Name: package_tour_activities package_tour_activities_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: package_tours package_tours_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_tours
    ADD CONSTRAINT package_tours_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: partner_invite_codes partner_invite_codes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_invite_codes
    ADD CONSTRAINT partner_invite_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: partner_transactions partner_transactions_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: partner_transactions partner_transactions_deletion_requested_by_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_deletion_requested_by_tenant_id_fkey FOREIGN KEY (deletion_requested_by_tenant_id) REFERENCES public.tenants(id);


--
-- Name: partner_transactions partner_transactions_receiver_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_receiver_tenant_id_fkey FOREIGN KEY (receiver_tenant_id) REFERENCES public.tenants(id);


--
-- Name: partner_transactions partner_transactions_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: partner_transactions partner_transactions_sender_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_transactions
    ADD CONSTRAINT partner_transactions_sender_tenant_id_fkey FOREIGN KEY (sender_tenant_id) REFERENCES public.tenants(id);


--
-- Name: payments payments_settlement_id_settlements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_settlement_id_settlements_id_fk FOREIGN KEY (settlement_id) REFERENCES public.settlements(id);


--
-- Name: payments payments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: platform_support_tickets platform_support_tickets_assigned_to_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_assigned_to_platform_admins_id_fk FOREIGN KEY (assigned_to) REFERENCES public.platform_admins(id);


--
-- Name: platform_support_tickets platform_support_tickets_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: platform_support_tickets platform_support_tickets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: request_message_templates request_message_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_message_templates
    ADD CONSTRAINT request_message_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: reservation_change_requests reservation_change_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_change_requests
    ADD CONSTRAINT reservation_change_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.app_users(id);


--
-- Name: reservation_change_requests reservation_change_requests_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_change_requests
    ADD CONSTRAINT reservation_change_requests_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: reservation_change_requests reservation_change_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_change_requests
    ADD CONSTRAINT reservation_change_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: reservation_requests reservation_requests_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: reservation_requests reservation_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.app_users(id);


--
-- Name: reservation_requests reservation_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.app_users(id);


--
-- Name: reservation_requests reservation_requests_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: reservation_requests reservation_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: reservations reservations_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: reservations reservations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: role_permissions role_permissions_permission_id_permissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_permissions_id_fk FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: settings settings_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: settlement_entries settlement_entries_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: settlement_entries settlement_entries_reservation_id_reservations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_reservation_id_reservations_id_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: settlement_entries settlement_entries_settlement_id_settlements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_settlement_id_settlements_id_fk FOREIGN KEY (settlement_id) REFERENCES public.settlements(id);


--
-- Name: settlement_entries settlement_entries_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: settlements settlements_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: settlements settlements_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: subscription_payments subscription_payments_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: subscriptions subscriptions_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: subscriptions subscriptions_plan_id_subscription_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_subscription_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: subscriptions subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_dispatch_items supplier_dispatch_items_dispatch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatch_items
    ADD CONSTRAINT supplier_dispatch_items_dispatch_id_fkey FOREIGN KEY (dispatch_id) REFERENCES public.supplier_dispatches(id);


--
-- Name: supplier_dispatches supplier_dispatches_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: supplier_dispatches supplier_dispatches_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: supplier_dispatches supplier_dispatches_payout_id_agency_payouts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_payout_id_agency_payouts_id_fk FOREIGN KEY (payout_id) REFERENCES public.agency_payouts(id);


--
-- Name: supplier_dispatches supplier_dispatches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: support_request_logs support_request_logs_log_id_system_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_request_logs
    ADD CONSTRAINT support_request_logs_log_id_system_logs_id_fk FOREIGN KEY (log_id) REFERENCES public.system_logs(id);


--
-- Name: support_request_logs support_request_logs_support_request_id_support_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_request_logs
    ADD CONSTRAINT support_request_logs_support_request_id_support_requests_id_fk FOREIGN KEY (support_request_id) REFERENCES public.support_requests(id);


--
-- Name: support_requests support_requests_reservation_id_reservations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_reservation_id_reservations_id_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: support_requests support_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: system_logs system_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_integrations tenant_integrations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_notification_settings tenant_notification_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_notification_settings
    ADD CONSTRAINT tenant_notification_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_partnerships tenant_partnerships_partner_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_partnerships
    ADD CONSTRAINT tenant_partnerships_partner_tenant_id_fkey FOREIGN KEY (partner_tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_partnerships tenant_partnerships_requester_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_partnerships
    ADD CONSTRAINT tenant_partnerships_requester_tenant_id_fkey FOREIGN KEY (requester_tenant_id) REFERENCES public.tenants(id);


--
-- Name: ticket_responses ticket_responses_responder_id_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_responder_id_platform_admins_id_fk FOREIGN KEY (responder_id) REFERENCES public.platform_admins(id);


--
-- Name: ticket_responses ticket_responses_ticket_id_platform_support_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_ticket_id_platform_support_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.platform_support_tickets(id);


--
-- Name: user_login_logs user_login_logs_user_id_app_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_user_id_app_users_id_fk FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: user_notification_preferences user_notification_preferences_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: user_roles user_roles_assigned_by_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_platform_admins_id_fk FOREIGN KEY (assigned_by) REFERENCES public.platform_admins(id);


--
-- Name: user_roles user_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_app_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_app_users_id_fk FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: viewer_activity_shares viewer_activity_shares_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_activity_shares
    ADD CONSTRAINT viewer_activity_shares_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: viewer_activity_shares viewer_activity_shares_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_activity_shares
    ADD CONSTRAINT viewer_activity_shares_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: viewer_activity_shares viewer_activity_shares_viewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewer_activity_shares
    ADD CONSTRAINT viewer_activity_shares_viewer_user_id_fkey FOREIGN KEY (viewer_user_id) REFERENCES public.app_users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict KWr9x8wBayJ6psP36HCwnPMUgJ7975jZwrk6xf5OPah4xfBNQAx2JGnNlrhx4R0

