--
-- PostgreSQL database dump
--

\restrict QJN0MJh2QyaeA33vZWpk2h3gk6jPAO7FIA8b6DUyATQpU2NlY92isU42Laa2cKt

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
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
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
    tenant_id integer
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO postgres;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: activity_costs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.activity_costs OWNER TO postgres;

--
-- Name: activity_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_costs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_costs_id_seq OWNER TO postgres;

--
-- Name: activity_costs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_costs_id_seq OWNED BY public.activity_costs.id;


--
-- Name: agencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agencies (
    id integer NOT NULL,
    name text NOT NULL,
    contact_info text,
    default_payout_per_guest integer DEFAULT 0,
    notes text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


ALTER TABLE public.agencies OWNER TO postgres;

--
-- Name: agencies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agencies_id_seq OWNER TO postgres;

--
-- Name: agencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agencies_id_seq OWNED BY public.agencies.id;


--
-- Name: agency_activity_rates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.agency_activity_rates OWNER TO postgres;

--
-- Name: agency_activity_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agency_activity_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agency_activity_rates_id_seq OWNER TO postgres;

--
-- Name: agency_activity_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agency_activity_rates_id_seq OWNED BY public.agency_activity_rates.id;


--
-- Name: agency_activity_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agency_activity_terms (
    id integer NOT NULL,
    agency_id integer NOT NULL,
    activity_id integer NOT NULL,
    payout_per_guest integer DEFAULT 0,
    effective_month text,
    tenant_id integer
);


ALTER TABLE public.agency_activity_terms OWNER TO postgres;

--
-- Name: agency_activity_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agency_activity_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agency_activity_terms_id_seq OWNER TO postgres;

--
-- Name: agency_activity_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agency_activity_terms_id_seq OWNED BY public.agency_activity_terms.id;


--
-- Name: agency_notes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.agency_notes OWNER TO postgres;

--
-- Name: agency_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agency_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agency_notes_id_seq OWNER TO postgres;

--
-- Name: agency_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agency_notes_id_seq OWNED BY public.agency_notes.id;


--
-- Name: agency_payouts; Type: TABLE; Schema: public; Owner: postgres
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
    tenant_id integer
);


ALTER TABLE public.agency_payouts OWNER TO postgres;

--
-- Name: agency_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agency_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agency_payouts_id_seq OWNER TO postgres;

--
-- Name: agency_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agency_payouts_id_seq OWNED BY public.agency_payouts.id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.announcements_id_seq OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: api_status_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.api_status_logs OWNER TO postgres;

--
-- Name: api_status_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_status_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_status_logs_id_seq OWNER TO postgres;

--
-- Name: api_status_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_status_logs_id_seq OWNED BY public.api_status_logs.id;


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.app_users OWNER TO postgres;

--
-- Name: app_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.app_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_users_id_seq OWNER TO postgres;

--
-- Name: app_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.app_users_id_seq OWNED BY public.app_users.id;


--
-- Name: app_versions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.app_versions OWNER TO postgres;

--
-- Name: app_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.app_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_versions_id_seq OWNER TO postgres;

--
-- Name: app_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.app_versions_id_seq OWNED BY public.app_versions.id;


--
-- Name: auto_responses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.auto_responses OWNER TO postgres;

--
-- Name: auto_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auto_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auto_responses_id_seq OWNER TO postgres;

--
-- Name: auto_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auto_responses_id_seq OWNED BY public.auto_responses.id;


--
-- Name: blacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blacklist (
    id integer NOT NULL,
    phone text NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer
);


ALTER TABLE public.blacklist OWNER TO postgres;

--
-- Name: blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blacklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blacklist_id_seq OWNER TO postgres;

--
-- Name: blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blacklist_id_seq OWNED BY public.blacklist.id;


--
-- Name: bot_quality_scores; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.bot_quality_scores OWNER TO postgres;

--
-- Name: bot_quality_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bot_quality_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bot_quality_scores_id_seq OWNER TO postgres;

--
-- Name: bot_quality_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bot_quality_scores_id_seq OWNED BY public.bot_quality_scores.id;


--
-- Name: capacity; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.capacity OWNER TO postgres;

--
-- Name: capacity_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.capacity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.capacity_id_seq OWNER TO postgres;

--
-- Name: capacity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.capacity_id_seq OWNED BY public.capacity.id;


--
-- Name: customer_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.customer_requests OWNER TO postgres;

--
-- Name: customer_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_requests_id_seq OWNER TO postgres;

--
-- Name: customer_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_requests_id_seq OWNED BY public.customer_requests.id;


--
-- Name: daily_message_usage; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.daily_message_usage OWNER TO postgres;

--
-- Name: daily_message_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_message_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_message_usage_id_seq OWNER TO postgres;

--
-- Name: daily_message_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_message_usage_id_seq OWNED BY public.daily_message_usage.id;


--
-- Name: database_backups; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.database_backups OWNER TO postgres;

--
-- Name: database_backups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.database_backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.database_backups_id_seq OWNER TO postgres;

--
-- Name: database_backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.database_backups_id_seq OWNED BY public.database_backups.id;


--
-- Name: error_events; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.error_events OWNER TO postgres;

--
-- Name: error_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.error_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.error_events_id_seq OWNER TO postgres;

--
-- Name: error_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.error_events_id_seq OWNED BY public.error_events.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holidays_id_seq OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: license; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.license OWNER TO postgres;

--
-- Name: license_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.license_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.license_id_seq OWNER TO postgres;

--
-- Name: license_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.license_id_seq OWNED BY public.license.id;


--
-- Name: login_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.login_logs OWNER TO postgres;

--
-- Name: login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_logs_id_seq OWNER TO postgres;

--
-- Name: login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_logs_id_seq OWNED BY public.login_logs.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: package_tour_activities; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.package_tour_activities OWNER TO postgres;

--
-- Name: package_tour_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.package_tour_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.package_tour_activities_id_seq OWNER TO postgres;

--
-- Name: package_tour_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.package_tour_activities_id_seq OWNED BY public.package_tour_activities.id;


--
-- Name: package_tours; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.package_tours OWNER TO postgres;

--
-- Name: package_tours_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.package_tours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.package_tours_id_seq OWNER TO postgres;

--
-- Name: package_tours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.package_tours_id_seq OWNED BY public.package_tours.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.plan_features OWNER TO postgres;

--
-- Name: plan_features_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plan_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plan_features_id_seq OWNER TO postgres;

--
-- Name: plan_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plan_features_id_seq OWNED BY public.plan_features.id;


--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.platform_admins OWNER TO postgres;

--
-- Name: platform_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.platform_admins_id_seq OWNER TO postgres;

--
-- Name: platform_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_admins_id_seq OWNED BY public.platform_admins.id;


--
-- Name: platform_support_tickets; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.platform_support_tickets OWNER TO postgres;

--
-- Name: platform_support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.platform_support_tickets_id_seq OWNER TO postgres;

--
-- Name: platform_support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_support_tickets_id_seq OWNED BY public.platform_support_tickets.id;


--
-- Name: request_message_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.request_message_templates OWNER TO postgres;

--
-- Name: request_message_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.request_message_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.request_message_templates_id_seq OWNER TO postgres;

--
-- Name: request_message_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.request_message_templates_id_seq OWNED BY public.request_message_templates.id;


--
-- Name: reservation_requests; Type: TABLE; Schema: public; Owner: postgres
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
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reservation_requests OWNER TO postgres;

--
-- Name: reservation_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservation_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservation_requests_id_seq OWNER TO postgres;

--
-- Name: reservation_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservation_requests_id_seq OWNED BY public.reservation_requests.id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: postgres
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
    payment_status text DEFAULT 'unpaid'::text
);


ALTER TABLE public.reservations OWNER TO postgres;

--
-- Name: reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservations_id_seq OWNER TO postgres;

--
-- Name: reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    tenant_id integer
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: settlement_entries; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.settlement_entries OWNER TO postgres;

--
-- Name: settlement_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settlement_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settlement_entries_id_seq OWNER TO postgres;

--
-- Name: settlement_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settlement_entries_id_seq OWNED BY public.settlement_entries.id;


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.settlements OWNER TO postgres;

--
-- Name: settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settlements_id_seq OWNER TO postgres;

--
-- Name: settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settlements_id_seq OWNED BY public.settlements.id;


--
-- Name: subscription_payments; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.subscription_payments OWNER TO postgres;

--
-- Name: subscription_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_payments_id_seq OWNER TO postgres;

--
-- Name: subscription_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_payments_id_seq OWNED BY public.subscription_payments.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.subscription_plans OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_plans_id_seq OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: supplier_dispatches; Type: TABLE; Schema: public; Owner: postgres
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
    tenant_id integer
);


ALTER TABLE public.supplier_dispatches OWNER TO postgres;

--
-- Name: supplier_dispatches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_dispatches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_dispatches_id_seq OWNER TO postgres;

--
-- Name: supplier_dispatches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_dispatches_id_seq OWNED BY public.supplier_dispatches.id;


--
-- Name: support_request_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_request_logs (
    id integer NOT NULL,
    support_request_id integer NOT NULL,
    log_id integer,
    message_snapshot text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_request_logs OWNER TO postgres;

--
-- Name: support_request_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_request_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_request_logs_id_seq OWNER TO postgres;

--
-- Name: support_request_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_request_logs_id_seq OWNED BY public.support_request_logs.id;


--
-- Name: support_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.support_requests OWNER TO postgres;

--
-- Name: support_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_requests_id_seq OWNER TO postgres;

--
-- Name: support_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_requests_id_seq OWNED BY public.support_requests.id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.system_logs OWNER TO postgres;

--
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_logs_id_seq OWNER TO postgres;

--
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- Name: tenant_integrations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tenant_integrations OWNER TO postgres;

--
-- Name: tenant_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenant_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_integrations_id_seq OWNER TO postgres;

--
-- Name: tenant_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenant_integrations_id_seq OWNED BY public.tenant_integrations.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenants_id_seq OWNER TO postgres;

--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: ticket_responses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ticket_responses OWNER TO postgres;

--
-- Name: ticket_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_responses_id_seq OWNER TO postgres;

--
-- Name: ticket_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_responses_id_seq OWNED BY public.ticket_responses.id;


--
-- Name: user_login_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_login_logs OWNER TO postgres;

--
-- Name: user_login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_login_logs_id_seq OWNER TO postgres;

--
-- Name: user_login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_login_logs_id_seq OWNED BY public.user_login_logs.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_costs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_costs ALTER COLUMN id SET DEFAULT nextval('public.activity_costs_id_seq'::regclass);


--
-- Name: agencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agencies ALTER COLUMN id SET DEFAULT nextval('public.agencies_id_seq'::regclass);


--
-- Name: agency_activity_rates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_rates ALTER COLUMN id SET DEFAULT nextval('public.agency_activity_rates_id_seq'::regclass);


--
-- Name: agency_activity_terms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_terms ALTER COLUMN id SET DEFAULT nextval('public.agency_activity_terms_id_seq'::regclass);


--
-- Name: agency_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_notes ALTER COLUMN id SET DEFAULT nextval('public.agency_notes_id_seq'::regclass);


--
-- Name: agency_payouts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_payouts ALTER COLUMN id SET DEFAULT nextval('public.agency_payouts_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: api_status_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_status_logs ALTER COLUMN id SET DEFAULT nextval('public.api_status_logs_id_seq'::regclass);


--
-- Name: app_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users ALTER COLUMN id SET DEFAULT nextval('public.app_users_id_seq'::regclass);


--
-- Name: app_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_versions ALTER COLUMN id SET DEFAULT nextval('public.app_versions_id_seq'::regclass);


--
-- Name: auto_responses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_responses ALTER COLUMN id SET DEFAULT nextval('public.auto_responses_id_seq'::regclass);


--
-- Name: blacklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist ALTER COLUMN id SET DEFAULT nextval('public.blacklist_id_seq'::regclass);


--
-- Name: bot_quality_scores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_quality_scores ALTER COLUMN id SET DEFAULT nextval('public.bot_quality_scores_id_seq'::regclass);


--
-- Name: capacity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capacity ALTER COLUMN id SET DEFAULT nextval('public.capacity_id_seq'::regclass);


--
-- Name: customer_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_requests ALTER COLUMN id SET DEFAULT nextval('public.customer_requests_id_seq'::regclass);


--
-- Name: daily_message_usage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_message_usage ALTER COLUMN id SET DEFAULT nextval('public.daily_message_usage_id_seq'::regclass);


--
-- Name: database_backups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.database_backups ALTER COLUMN id SET DEFAULT nextval('public.database_backups_id_seq'::regclass);


--
-- Name: error_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_events ALTER COLUMN id SET DEFAULT nextval('public.error_events_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: license id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license ALTER COLUMN id SET DEFAULT nextval('public.license_id_seq'::regclass);


--
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: package_tour_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tour_activities ALTER COLUMN id SET DEFAULT nextval('public.package_tour_activities_id_seq'::regclass);


--
-- Name: package_tours id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tours ALTER COLUMN id SET DEFAULT nextval('public.package_tours_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: plan_features id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features ALTER COLUMN id SET DEFAULT nextval('public.plan_features_id_seq'::regclass);


--
-- Name: platform_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_admins ALTER COLUMN id SET DEFAULT nextval('public.platform_admins_id_seq'::regclass);


--
-- Name: platform_support_tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_support_tickets ALTER COLUMN id SET DEFAULT nextval('public.platform_support_tickets_id_seq'::regclass);


--
-- Name: request_message_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_message_templates ALTER COLUMN id SET DEFAULT nextval('public.request_message_templates_id_seq'::regclass);


--
-- Name: reservation_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_requests ALTER COLUMN id SET DEFAULT nextval('public.reservation_requests_id_seq'::regclass);


--
-- Name: reservations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: settlement_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_entries ALTER COLUMN id SET DEFAULT nextval('public.settlement_entries_id_seq'::regclass);


--
-- Name: settlements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements ALTER COLUMN id SET DEFAULT nextval('public.settlements_id_seq'::regclass);


--
-- Name: subscription_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payments ALTER COLUMN id SET DEFAULT nextval('public.subscription_payments_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: supplier_dispatches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_dispatches ALTER COLUMN id SET DEFAULT nextval('public.supplier_dispatches_id_seq'::regclass);


--
-- Name: support_request_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_request_logs ALTER COLUMN id SET DEFAULT nextval('public.support_request_logs_id_seq'::regclass);


--
-- Name: support_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests ALTER COLUMN id SET DEFAULT nextval('public.support_requests_id_seq'::regclass);


--
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- Name: tenant_integrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_integrations ALTER COLUMN id SET DEFAULT nextval('public.tenant_integrations_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: ticket_responses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_responses ALTER COLUMN id SET DEFAULT nextval('public.ticket_responses_id_seq'::regclass);


--
-- Name: user_login_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login_logs ALTER COLUMN id SET DEFAULT nextval('public.user_login_logs_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, name, description, price, duration_minutes, active, daily_frequency, default_times, confirmation_message, default_capacity, agency_phone, admin_phone, send_notification_to_agency, send_notification_to_admin, notification_message_template, name_aliases, price_usd, reservation_link, reservation_link_en, has_free_hotel_transfer, transfer_zones, extras, faq, color, tenant_id) FROM stdin;
6	at turu		1000	26	t	3	["09:00","13:00","17:00"]	Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Rezervasyonunuzu takip etmek için: {takip_linki} Teşekkür ederiz.	6	\N	323423423	f	t	Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kişiSayısı}	["horse"]	10	https://skyfethiye.com/aktiviteler/fethiye-yamac-parasutu/	https://skyfethiye.com/en/activities/paragliding-fethiye/	t	["hisarönü"]	[{"name":"Fotoğraflar","priceTl":1000,"priceUsd":20,"description":"Opsiyonel"}]	[{"question":"Kaç dakika","answer":"30 dakikalık tur"}]	pink	7
7	Tekne Turu	günlük tur 	1000	420	t	1	["09:00"]	\N	10	23423423	234234234	t	t	Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kişiSayısı}	["Boat Tour"]	20	https://skyfethiye.com/aktiviteler/fethiye-yamac-parasutu/	https://skyfethiye.com/en/activities/paragliding-fethiye/	f	[]	[{"name":"kantin","priceTl":0,"priceUsd":0,"description":""}]	[{"question":"Tekne kaç kişilik","answer":"teknemiz 100 kişiliktir"}]	green	7
\.


--
-- Data for Name: activity_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_costs (id, activity_id, month, fixed_cost, variable_cost_per_guest, notes, tenant_id) FROM stdin;
\.


--
-- Data for Name: agencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agencies (id, name, contact_info, default_payout_per_guest, notes, active, created_at, tenant_id) FROM stdin;
\.


--
-- Data for Name: agency_activity_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agency_activity_rates (id, agency_id, activity_id, valid_from, valid_to, unit_payout_tl, notes, is_active, created_at, unit_payout_usd, currency, tenant_id) FROM stdin;
\.


--
-- Data for Name: agency_activity_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agency_activity_terms (id, agency_id, activity_id, payout_per_guest, effective_month, tenant_id) FROM stdin;
\.


--
-- Data for Name: agency_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agency_notes (id, tenant_id, admin_id, content, note_type, is_important, created_at) FROM stdin;
\.


--
-- Data for Name: agency_payouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agency_payouts (id, agency_id, period_start, period_end, description, guest_count, base_amount_tl, vat_rate_pct, vat_amount_tl, total_amount_tl, method, reference, notes, status, created_at, tenant_id) FROM stdin;
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, title, content, type, target_audience, priority, is_active, starts_at, expires_at, created_at) FROM stdin;
1	Yeni Ozellik	Artik rezervasyonlari surukle birak ile takvime ekleyebilirsiniz!	info	all	0	t	\N	\N	2026-01-06 07:54:50.712074
2	Bakim Bildirimi	Yarin gece 02:00-04:00 arasi sistem bakimda olacaktir.	warning	all	0	t	\N	\N	2026-01-05 07:54:50.712074
\.


--
-- Data for Name: api_status_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_status_logs (id, service, status, response_time_ms, error_message, error_count, last_success_at, last_error_at, checked_at) FROM stdin;
\.


--
-- Data for Name: app_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_users (id, username, email, password_hash, name, phone, company_name, membership_type, membership_start_date, membership_end_date, plan_id, is_active, is_suspended, suspend_reason, max_activities, max_reservations_per_month, last_login_at, login_count, created_by, notes, created_at, updated_at, tenant_id, is_system_protected) FROM stdin;
2	Skyfethiye	skyfethiye@gmail.com	d6042215e5d01947b1beaaf04caabf55:26c829fad3fbd602bdb5e63983fb06038964df318b6ff509137d6ee0f6cd492009ff185b5e510d950fa6ef8e9b2092374c67e57848b8f8575573d54dbc8aa72b	Metin Işık	05384944505	Sky Fethiye	professional	2026-01-05 14:51:26.753	\N	\N	t	f	\N	50	1000	2026-01-06 06:55:51.08	9	\N	Sky Fethiye acentasi yonetici hesabi	2026-01-05 14:51:26.755282	2026-01-05 15:28:51.142	2	f
8	superadmin	flymet.mail@gmail.com	d7a0e0552941f2d4ca39a3e09306b3c9:1ad401276717ecf21f20f559374208ebc8fc0c37ef1479c57019bce0c8d7c1e546fa47526fd818cc2ed40a0173ddc36b8500710ab1bcf30eba476a73d0906333	Süper Admin	\N	\N	trial	\N	\N	\N	t	f	\N	5	100	\N	0	\N	\N	2026-01-06 14:54:34.079292	2026-01-06 14:54:34.079292	8	t
7	acenta	acenta@acenta.com	f7661270f1d4349e6698623c802cdfd9:d4fa5b56a0f69f52c3f6948f118d913f34da44f458cbbd9fb53f7fff480c303a0ad36c391a3e5d315639eb1484500199ba52e86b748a02fe5881fbcdd95f915c	Acenta Acenta	5555555555	acenta	professional	2026-01-06 07:11:00.946	2026-02-05 07:11:00.946	\N	t	f	\N	50	1000	2026-01-07 07:42:18.922	2	\N	acenta acentasi yönetiçi hesabı	2026-01-06 07:11:00.948427	2026-01-06 07:11:00.948427	7	f
9	isortagi2	2232@gmail.com	820a683b12616dafd4485aa355e2350f:8f05c73e21a1d1878f38a2e8f17560be890bdca74fc36215390e6dee45e9d7943fa217ff8cceb744d7da73c794133faae4d1875d6746ff5707128a44e40d10b3	İş Ortağı 2	5305556557	acenta	professional	2026-01-07 07:14:47.23	\N	\N	t	f	\N	50	1000	2026-01-07 07:20:13.889	2	\N	acenta acentasi kullanıcısi	2026-01-07 07:14:47.237127	2026-01-07 08:15:59.539	7	f
\.


--
-- Data for Name: app_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_versions (id, version, file_name, file_size, checksum, status, notes, uploaded_by, backup_file_name, is_rollback_target, activated_at, created_at) FROM stdin;
\.


--
-- Data for Name: auto_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auto_responses (id, name, keywords, response, priority, is_active, created_at, keywords_en, response_en, tenant_id) FROM stdin;
11	Fiyat Bilgisi	["fiyat","ücret","ne kadar","kaç para","kaç tl","ucuz","pahalı"]	Fiyat bilgisi için lütfen aktivite sayfamızı ziyaret edin veya temsilcimizle görüşmek için bekleyin.	10	t	2026-01-06 07:11:00.96175	["price","cost","how much","fee","rate"]	For pricing information, please visit our activity page or wait to speak with our representative.	7
12	Rezervasyon Durumu	["rezervasyon","booking","kayıt","yer ayırtma","randevu"]	Rezervasyon durumunuzu kontrol etmek için rezervasyon numaranızı paylaşabilir misiniz?	9	t	2026-01-06 07:11:00.965283	["reservation","booking","appointment","schedule"]	To check your reservation status, could you please share your reservation number?	7
13	İptal/Değişiklik	["iptal","değişiklik","tarih değiştir","saat değiştir","erteleme"]	Rezervasyon iptali veya değişikliği için lütfen rezervasyon numaranızı ve talebinizi belirtin. Temsilcimiz en kısa sürede size dönüş yapacaktır.	8	t	2026-01-06 07:11:00.971845	["cancel","change","reschedule","modify","postpone"]	For cancellation or modification, please provide your reservation number and request. Our representative will get back to you shortly.	7
14	Çalışma Saatleri	["saat","çalışma saati","açık mı","kapalı mı","ne zaman"]	Çalışma saatlerimiz hakkında bilgi almak için web sitemizi ziyaret edebilir veya mesai saatleri içinde bizi arayabilirsiniz.	5	t	2026-01-06 07:11:00.974623	["hours","open","closed","when","time"]	For our working hours, please visit our website or call us during business hours.	7
15	Selamlama	["merhaba","selam","günaydın","iyi günler","iyi akşamlar"]	Merhaba! Size nasıl yardımcı olabiliriz?	1	t	2026-01-06 07:11:00.978811	["hello","hi","good morning","good evening","hey"]	Hello! How can we help you?	7
\.


--
-- Data for Name: blacklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blacklist (id, phone, reason, created_at, tenant_id) FROM stdin;
\.


--
-- Data for Name: bot_quality_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bot_quality_scores (id, message_id, phone, question, response, response_time_ms, was_escalated, was_helpful, feedback_score, error_occurred, used_fallback, created_at, tenant_id) FROM stdin;
\.


--
-- Data for Name: capacity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.capacity (id, activity_id, date, "time", total_slots, booked_slots, tenant_id) FROM stdin;
\.


--
-- Data for Name: customer_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_requests (id, reservation_id, request_type, request_details, preferred_time, customer_name, customer_phone, customer_email, status, admin_notes, email_sent, created_at, processed_at, tenant_id) FROM stdin;
6	10	time_change	Saat degisikligi istiyorum, 14:00 yerine 16:00 olabilir mi?	16:00	Ahmet Yilmaz	+905551234567	ahmet@email.com	pending	\N	f	2026-01-06 05:55:39.885656	\N	7
7	11	cancellation	Maalesef iptal etmem gerekiyor, hasta oldum.	\N	Fatma Kaya	+905559876543	fatma@email.com	pending	\N	f	2026-01-06 06:55:39.885656	\N	7
8	12	info	Fiyat ve detaylar hakkinda bilgi almak istiyorum.	\N	Mehmet Demir	+905553334444	mehmet@email.com	approved	\N	f	2026-01-06 04:55:39.885656	\N	7
\.


--
-- Data for Name: daily_message_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_message_usage (id, tenant_id, date, message_count, last_message_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: database_backups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.database_backups (id, name, description, file_name, file_size, table_count, row_count, status, backup_type, created_by, restored_at, restored_by, created_at) FROM stdin;
1	replityedek7ocak0710		backup_2026-01-07T04-10-25-264Z.json	32176	17	147	completed	manual	super_admin	\N	\N	2026-01-07 04:10:25.347317
2	yedek2		backup_2026-01-07T06-33-29-515Z.json	32135	17	146	completed	manual	super_admin	\N	\N	2026-01-07 06:33:29.535388
\.


--
-- Data for Name: error_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.error_events (id, tenant_id, severity, category, source, message, suggestion, request_path, request_method, status_code, user_id, user_email, tenant_name, metadata, occurred_at, status, resolved_at, resolved_by, resolution_notes) FROM stdin;
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, name, start_date, end_date, type, keywords, notes, is_active, tenant_id) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, tenant_id, subscription_id, invoice_number, agency_name, agency_email, period_start, period_end, subtotal_tl, vat_rate_pct, vat_amount_tl, total_tl, subtotal_usd, total_usd, currency, status, due_date, paid_at, payment_method, payment_reference, notes, created_at) FROM stdin;
\.


--
-- Data for Name: license; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.license (id, license_key, agency_name, agency_email, agency_phone, plan_type, plan_name, max_activities, max_reservations_per_month, max_users, features, start_date, expiry_date, is_active, last_verified_at, created_at, updated_at) FROM stdin;
1	345345	ssd	\N	\N	trial	Deneme	5	50	1	[]	2026-01-05 05:09:20.939	2026-02-04 16:16:08.848103	t	2026-01-06 08:17:57.071	2026-01-05 05:09:20.950685	2026-01-05 16:16:08.848103
\.


--
-- Data for Name: login_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_logs (id, admin_id, email, ip_address, user_agent, status, failure_reason, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, phone, content, role, "timestamp", requires_human_intervention, tenant_id) FROM stdin;
23	+905551112233	Merhaba, fiyat bilgisi alabilir miyim?	user	2026-01-06 07:44:27.502455	t	7
24	+905551112233	Fiyat bilgisi için lütfen müşteri temsilcimiz size yardımcı olacak.	assistant	2026-01-06 07:45:27.502455	f	7
25	+905554445566	Rezervasyon detaylarını öğrenmek istiyorum	user	2026-01-06 07:14:27.502455	t	7
26	+905554445566	Müşteri temsilcimiz en kısa sürede size dönecektir.	assistant	2026-01-06 07:15:27.502455	f	7
\.


--
-- Data for Name: package_tour_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.package_tour_activities (id, package_tour_id, activity_id, day_offset, default_time, sort_order, tenant_id) FROM stdin;
\.


--
-- Data for Name: package_tours; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.package_tours (id, name, name_aliases, description, price, price_usd, confirmation_message, reservation_link, reservation_link_en, active, created_at, faq, tenant_id) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, settlement_id, amount_tl, method, reference, notes, paid_at, tenant_id) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, key, name, description, category, sort_order) FROM stdin;
1	dashboard.view	Dashboard Goruntule	\N	dashboard	1
2	reservations.view	Rezervasyonlari Goruntule	\N	reservations	1
3	reservations.create	Rezervasyon Olustur	\N	reservations	2
4	reservations.edit	Rezervasyon Duzenle	\N	reservations	3
5	reservations.delete	Rezervasyon Sil	\N	reservations	4
6	activities.view	Aktiviteleri Goruntule	\N	activities	1
7	activities.manage	Aktiviteleri Yonet	\N	activities	2
8	calendar.view	Takvimi Goruntule	\N	calendar	1
9	calendar.manage	Takvimi Yonet	\N	calendar	2
10	reports.view	Raporlari Goruntule	\N	reports	1
11	reports.export	Rapor Indir	\N	reports	2
12	finance.view	Finans Goruntule	\N	finance	1
13	finance.manage	Finans Yonet	\N	finance	2
14	settings.view	Ayarlari Goruntule	\N	settings	1
15	settings.manage	Ayarlari Yonet	\N	settings	2
16	users.view	Kullanicilari Goruntule	\N	users	1
17	users.manage	Kullanicilari Yonet	\N	users	2
18	whatsapp.view	WhatsApp Goruntule	\N	whatsapp	1
19	whatsapp.manage	WhatsApp Yonet	\N	whatsapp	2
20	bot.view	Bot Ayarlarini Goruntule	\N	bot	1
21	bot.manage	Bot Ayarlarini Yonet	\N	bot	2
22	agencies.view	Acentalari Goruntule	\N	agencies	1
23	agencies.manage	Acentalari Yonet	\N	agencies	2
24	subscription.view	Abonelik Goruntule	\N	subscription	1
25	subscription.manage	Abonelik Yonet	\N	subscription	2
26	capacity.view	Kapasite Goruntule	Musaitlik ve kapasite bilgilerini goruntuleme	capacity	1
27	reservations.request	Rezervasyon Talebi Olustur	Onay gerektiren rezervasyon talebi olusturma	reservations	5
\.


--
-- Data for Name: plan_features; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plan_features (id, key, label, description, icon, category, sort_order, is_active, created_at) FROM stdin;
1	basic_calendar	Temel Takvim	Rezervasyon takvimi görüntüleme	Calendar	core	0	t	2026-01-05 06:49:07.883141
2	manual_reservations	Manuel Rezervasyon	Manuel rezervasyon oluşturma	ClipboardList	core	1	t	2026-01-05 06:49:07.898385
3	whatsapp_notifications	WhatsApp Bildirimleri	WhatsApp üzerinden bildirim gönderme	MessageCircle	communication	2	t	2026-01-05 06:49:07.902119
4	basic_reports	Temel Raporlar	Basit istatistik raporları	BarChart3	analytics	3	t	2026-01-05 06:49:07.905623
5	advanced_reports	Gelişmiş Raporlar	Detaylı analiz ve raporlama	TrendingUp	analytics	4	t	2026-01-05 06:49:07.909743
6	ai_bot	AI Bot	Yapay zeka destekli müşteri yanıtları	Bot	automation	5	t	2026-01-05 06:49:07.913614
7	woocommerce	WooCommerce Entegrasyonu	E-ticaret sitesi entegrasyonu	ShoppingCart	integration	6	t	2026-01-05 06:49:07.918828
8	package_tours	Paket Turlar	Çoklu aktivite paket turları	Package	core	7	t	2026-01-05 06:49:07.923034
9	api_access	API Erişimi	Dış sistemler için API erişimi	Code	integration	8	t	2026-01-05 06:49:07.927615
10	priority_support	Öncelikli Destek	7/24 öncelikli teknik destek	HeadphonesIcon	support	9	t	2026-01-05 06:49:07.931982
11	custom_branding	Özel Marka	Kendi logonuz ve renk temanız	Palette	customization	10	t	2026-01-05 06:49:07.939027
\.


--
-- Data for Name: platform_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_admins (id, email, password_hash, name, role, is_active, last_login_at, created_at, updated_at) FROM stdin;
2	flymet.mail@gmail.com	c8c23521eafd676ab201c93c0bd055ff:f5954c5d8274c257d5b4041320ff764cd7f2b0e5776c38c6e849482fb4365bf4a2b6e6e5bd336a4cea69bd49f5187107e9123254b8ef7a6448de54c4dc067514	flymet	super_admin	t	\N	2026-01-05 14:20:55.297094	2026-01-05 14:20:55.297094
\.


--
-- Data for Name: platform_support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_support_tickets (id, tenant_id, agency_name, agency_email, subject, description, priority, status, category, assigned_to, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: request_message_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.request_message_templates (id, name, template_type, message_content, is_default, is_active, created_at, tenant_id) FROM stdin;
10	Talep Onaylandı	approved	Sayın {customerName}, {requestType} talebiniz onaylanmıştır. Teşekkür ederiz.	f	t	2026-01-06 07:11:00.982214	7
11	Talep Değerlendiriliyor	pending	Sayın {customerName}, {requestType} talebiniz değerlendirilmektedir. En kısa sürede size dönüş yapacağız.	f	t	2026-01-06 07:11:00.985574	7
12	Talep Reddedildi	rejected	Sayın {customerName}, üzgünüz ancak {requestType} talebinizi karşılayamıyoruz. Detaylar için bizimle iletişime geçebilirsiniz.	f	t	2026-01-06 07:11:00.989155	7
\.


--
-- Data for Name: reservation_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservation_requests (id, tenant_id, activity_id, date, "time", customer_name, customer_phone, guests, notes, status, requested_by, processed_by, processed_at, process_notes, reservation_id, created_at) FROM stdin;
1	7	7	2026-01-28	09:00	deneme	51512627618	1	asfas	pending	9	\N	\N	\N	\N	2026-01-07 07:20:34.510325
2	7	7	2026-01-07	09:00	deneme	34324	2	fsdfsf	converted	9	7	2026-01-07 08:03:55.228	\N	16	2026-01-07 07:40:50.355087
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservations (id, activity_id, customer_name, customer_phone, customer_email, date, "time", quantity, status, source, external_id, created_at, price_tl, price_usd, currency, agency_id, order_subtotal, order_total, order_tax, settlement_id, package_tour_id, parent_reservation_id, order_number, tracking_token, tracking_token_expires_at, hotel_name, has_transfer, tenant_id, payment_status) FROM stdin;
10	6	Ahmet Yilmaz	+905551234567	ahmet@email.com	2026-01-10	14:00	2	confirmed	whatsapp	\N	2026-01-06 07:55:25.630059	2000	0	TRY	\N	0	0	0	\N	\N	\N	\N	token_ahmet_123	\N	\N	f	7	unpaid
11	6	Fatma Kaya	+905559876543	fatma@email.com	2026-01-11	10:00	4	confirmed	whatsapp	\N	2026-01-06 07:55:25.630059	4000	0	TRY	\N	0	0	0	\N	\N	\N	\N	token_fatma_456	\N	\N	f	7	unpaid
12	6	Mehmet Demir	+905553334444	mehmet@email.com	2026-01-12	16:00	1	pending	whatsapp	\N	2026-01-06 07:55:25.630059	1000	0	TRY	\N	0	0	0	\N	\N	\N	\N	token_mehmet_789	\N	\N	f	7	unpaid
16	7	deneme	34324	\N	2026-01-07	09:00	2	pending	partner	\N	2026-01-07 08:03:55.220742	0	0	TRY	\N	0	0	0	\N	\N	\N	\N	\N	\N	\N	f	7	unpaid
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, role_id, permission_id) FROM stdin;
1	4	1
2	4	2
3	4	3
4	4	4
5	4	5
6	4	6
7	4	7
8	4	8
9	4	9
10	4	10
11	4	11
12	4	12
13	4	13
14	4	14
15	4	15
16	4	16
17	4	17
18	4	18
19	4	19
20	4	20
21	4	21
22	4	22
23	4	23
24	4	24
25	4	25
26	5	1
27	5	2
28	5	3
29	5	4
30	5	5
31	5	6
32	5	7
33	5	8
34	5	9
35	5	10
36	5	11
37	5	12
38	5	13
39	5	14
40	5	16
41	5	17
42	5	18
43	5	19
44	5	20
45	5	21
46	5	22
47	5	23
48	6	1
49	6	2
50	6	3
51	6	4
52	6	6
53	6	8
54	6	10
55	6	18
56	3	26
58	4	26
59	5	26
60	6	26
61	3	27
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, display_name, description, color, is_system, is_active, created_at, updated_at) FROM stdin;
1	admin	Yonetici	Tam yetkili yonetici	red	t	t	2026-01-05 10:44:10.305619	2026-01-05 10:44:10.305619
2	operator	Operator	Rezervasyon ve aktivite islemleri	blue	t	t	2026-01-05 10:44:10.312402	2026-01-05 10:44:10.312402
4	tenant_owner	Sahip	Acenta sahibi - tam yetki (ayarlar, faturalar, kullanici yonetimi)	purple	t	t	2026-01-05 12:57:49.159391	2026-01-05 12:57:49.159391
5	tenant_manager	Yonetici	Operasyonel yonetici - aktiviteler, bot, finans, rezervasyonlar	blue	t	t	2026-01-05 12:57:49.343008	2026-01-05 12:57:49.343008
6	tenant_operator	Operator	Gunluk islemler - rezervasyon ve mesajlar	green	t	t	2026-01-05 12:57:49.606	2026-01-05 12:57:49.606
3	viewer	Is Ortagi	Partner acenta erisimi	gray	t	t	2026-01-05 10:44:10.316484	2026-01-05 10:44:10.316484
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
EJHXtjjCMfxDbFGNgrKE9aKGOuWb3XTh	{"cookie":{"originalMaxAge":604800000,"expires":"2026-01-14T07:42:18.942Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":7,"tenantId":7,"username":"acenta","roles":[4],"permissions":["activities.view","activities.manage","agencies.view","agencies.manage","bot.view","bot.manage","calendar.view","calendar.manage","capacity.view","dashboard.view","finance.view","finance.manage","reports.view","reports.export","reservations.view","reservations.create","reservations.edit","reservations.delete","settings.view","settings.manage","subscription.view","subscription.manage","users.view","users.manage","whatsapp.view","whatsapp.manage"]}	2026-01-14 09:48:28
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, key, value, tenant_id) FROM stdin;
19	botRules	\n=== 1. İLETİŞİM PROTOKOLÜ ===\n\n1.1 DİL UYUMU: Müşteri hangi dilde yazıyorsa o dilde devam et.\n\n1.2 KARŞILAMA: İlk mesajda talep yoksa sadece şunu yaz:\n"Merhaba, acenta'ye hoş geldiniz. Size nasıl yardımcı olabilirim? / You may continue in English if you wish."\n\n1.3 ÜSLUP: Kurumsal, net, güven veren ve çözüm odaklı bir dil kullan.\n\n1.4 SORU YÖNETİMİ: Müşteriyi anlamak için tek seferde en fazla bir (1) açıklayıcı soru sor. Birden fazla soruyu aynı mesajda birleştirme.\n\n1.5 BİLGİ SINIRI: Sadece acenta hizmetleri hakkında bilgi ver. Bilgileri sadece "Aktiviteler", "Paket Turlar" ve sistem verilerinden al. İnternetten genel bilgi çekme.\n\n=== 2. MÜSAİTLİK VE KONTENJAN ===\n\n2.1 MÜSAİTLİK KONTROLÜ: Yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ'ndeki yarın tarihini kullan.\n\n2.2 BİLGİ YOKSA: Müşteriye "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.\n\n=== 3. AKTİVİTE VE REZERVASYON KURALLARI ===\n\n3.1 OPERASYONEL GRUPLANDIRMA:\n- Yarım Günlük: Yamaç Paraşütü, Tüplü Dalış (Yarım Gün), ATV Safari, At Turu\n- Tam Günlük: Rafting, Jeep Safari, Tekne Turu, Tüplü Dalış (Tam Gün)\n- Aynı Gün Yapılabilenler: Yamaç Paraşütü ve tüm yarım günlük aktiviteler\n\n3.2 REZERVASYON AKIŞI:\n1) Müsaitlik: "Takvim & Kapasite" verilerine göre cevap ver\n2) Bilgi Teyidi: Rezervasyon linki vermeden önce kişi sayısı, isim ve telefon bilgilerini mutlaka teyit et\n3) Link Paylaşımı: Müşterinin diline uygun (TR/EN) rezervasyon linkini gönder. Birden fazla aktivite varsa tüm linkleri paylaş ve sepete ekleyerek ödeme yapabileceğini belirt\n\n3.3 UÇUŞ & DALIŞ PAKETİ: Her iki aktiviteyle ilgilenenlere indirimli "Uçuş ve Dalış Paketi" linkini öner.\n- UYARI: Aynı gün isteniyorsa dalışın mutlaka "Yarım Gün" olması gerektiğini, tam günün zamanlama açısından uymadığını belirt.\n\n3.4 YOĞUN SEZON (Temmuz-Ağustos): "Tam Günlük Tüplü Dalış" ve "Tekne Turu" için en erken 24 saat sonrasına rezervasyon yapılabileceğini vurgula.\n\n3.5 REZERVASYON LİNKİ SEÇİMİ: \n- İngilizce konuşuyorsan "EN Reservation Link" kullan\n- İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder (fallback)\n- Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan\n\n3.6 TEMEL KURAL: Bot asla doğrudan rezervasyon oluşturmaz. Ön ödeme olmadan rezervasyon alınmaz. Müsaitlik varsa "Müsaitlik mevcut, rezervasyonunuzu web sitemizden oluşturabilirsiniz" de ve ilgili linki paylaş.\n\n=== 4. BİLGİ SORGULARI ===\n\n4.1 TRANSFER SORULARI: Aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.\n\n4.2 EKSTRA HİZMETLER: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda "Ekstra Hizmetler" listesini kullan ve fiyatları ver.\n\n4.3 PAKET TURLAR: Birden fazla aktivite içeren paket turlar hakkında soru gelirse PAKET TURLAR bölümünü kullan.\n\n4.4 SIK SORULAN SORULAR: Her aktivite/paket tur için tanımlı SSS bölümünü kontrol et. Müşterinin sorusu bunlarla eşleşiyorsa oradaki cevabı kullan.\n\n=== 5. SİPARİŞ YÖNETİMİ ===\n\n5.1 SİPARİŞ NUMARASI: Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.\n\n5.2 SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa, konuşulan dile göre "Türkçe Sipariş Onay Mesajı" veya "İngilizce Sipariş Onay Mesajı" alanını seç. Mesajı olduğu gibi, hiçbir değişiklik yapmadan ilet.\n\n5.3 REZERVASYON TAKİP SAYFASI: Rezervasyon onaylandıktan sonra müşteriye şunu mutlaka bildir:\n"Rezervasyonunuzun detaylarını görüntüleyebileceğiniz ve değişiklik/iptal talebi oluşturabileceğiniz takip linkinizi WhatsApp'a gönderdik. Bu link üzerinden tüm işlemlerinizi yapabilirsiniz."\n\n5.4 DEĞİŞİKLİK/İPTAL TALEPLERİ: Saat/tarih değişikliği veya iptal isteyenlere şunu söyle:\n"Size gönderdiğimiz takip linkinden rezervasyon bilgilerinizi görüntüleyebilir ve değişiklik/iptal talebi oluşturabilirsiniz. Takip linkiniz yoksa veya süresi dolmuşsa, sipariş numaranızı paylaşın, size yeni link gönderelim."\n\n=== 6. SORUN ÇÖZME VE ESKALASYON ===\n\n6.1 ESKALASYON GEREKTİREN DURUMLAR:\n- Sorun 2 mesaj içinde çözülemiyorsa\n- Müşteri memnuniyetsiz veya agresifse\n- "Destek talebi", "Operatör", "Beni arayın" gibi ifadeler kullanılırsa\n- Fiyat indirimi, grup indirimi gibi özel talepler gelirse\n- Takip sayfasından gelen talepler (bunlar otomatik bildirim olarak gelir)\n\n6.2 ESKALASYON SÜRECİ: Bu durumlarda şunu söyle:\n"Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir."\n	7
20	botPrompt	Sen acenta bünyesinde görev yapan, profesyonel bir müşteri danışmanısın. Temel görevin; turizm aktiviteleri için rezervasyon almak, müsaitlik sorgulamak ve müşteri sorularını kurumsal bir dille yanıtlamaktır. Kendini asla bir yapay zeka olarak tanıtma; her zaman profesyonel bir çalışan rolünde kal.	7
21	botAccess	{"enabled":true,"activities":true,"packageTours":true,"capacity":true,"faq":true,"confirmation":true,"transfer":true,"extras":true}	7
12	botRulesSessionToken	{"token":"44d3fe318454f87ca6f27219ccb4bf7f085e4e1975b793314ddea630ad0db87c","expiresAt":1767798018353}	\N
\.


--
-- Data for Name: settlement_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settlement_entries (id, settlement_id, reservation_id, activity_id, guest_count, revenue_tl, cost_tl, payout_tl, tenant_id) FROM stdin;
\.


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settlements (id, agency_id, period_start, period_end, status, total_guests, gross_sales_tl, gross_sales_usd, total_cost_tl, payout_tl, payout_usd, vat_rate_pct, vat_amount_tl, profit_tl, paid_amount_tl, remaining_tl, created_at, extras_tl, tenant_id) FROM stdin;
\.


--
-- Data for Name: subscription_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_payments (id, subscription_id, amount_tl, amount_usd, currency, status, payment_method, provider_payment_id, provider_response, invoice_number, invoice_url, failure_reason, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_plans (id, code, name, description, price_tl, price_usd, yearly_price_tl, yearly_price_usd, yearly_discount_pct, trial_days, max_activities, max_reservations_per_month, max_users, max_whatsapp_numbers, features, sort_order, is_active, is_popular, created_at, updated_at, max_daily_messages, max_daily_reservations) FROM stdin;
1	trial	Deneme	14 günlük ücretsiz deneme	0	0	0	0	20	14	3	50	1	1	["basic_calendar","manual_reservations"]	0	t	f	2026-01-05 05:23:25.862078	2026-01-05 05:23:25.862078	50	5
2	basic	Basic	Küçük işletmeler için temel paket	99900	2900	959000	27900	20	0	5	200	2	1	["basic_calendar","manual_reservations","whatsapp_notifications","basic_reports"]	1	t	f	2026-01-05 05:23:25.882861	2026-01-05 05:23:25.882861	200	20
3	professional	Professional	Büyüyen işletmeler için gelişmiş özellikler	249900	6900	2399000	66300	20	0	20	1000	5	3	["basic_calendar","manual_reservations","whatsapp_notifications","advanced_reports","ai_bot","woocommerce","package_tours"]	2	t	t	2026-01-05 05:23:25.887214	2026-01-05 05:23:25.887214	1000	100
4	enterprise	Enterprise	Büyük ölçekli operasyonlar için sınırsız erişim	499900	14900	4799000	143000	20	0	9999	99999	99	10	["basic_calendar","manual_reservations","whatsapp_notifications","advanced_reports","ai_bot","woocommerce","package_tours","api_access","priority_support","custom_branding"]	3	t	f	2026-01-05 05:23:25.89116	2026-01-05 05:23:25.89116	10000	9999
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_end, cancelled_at, cancel_reason, payment_provider, provider_customer_id, provider_subscription_id, last_payment_at, next_payment_at, failed_payment_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: supplier_dispatches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_dispatches (id, agency_id, activity_id, dispatch_date, dispatch_time, guest_count, unit_payout_tl, total_payout_tl, payout_id, notes, created_at, rate_id, tenant_id) FROM stdin;
\.


--
-- Data for Name: support_request_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_request_logs (id, support_request_id, log_id, message_snapshot, created_at) FROM stdin;
\.


--
-- Data for Name: support_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_requests (id, phone, status, reservation_id, created_at, resolved_at, description, tenant_id) FROM stdin;
7	[Soru] Test  <test@gmail.com> - sa	open	\N	2026-01-06 05:54:17.935423	\N	\N	\N
8	[Soru] Test  <test@gmail.com> - php sürümü	open	\N	2026-01-06 05:54:34.570343	\N	\N	\N
9	+905551112233	open	\N	2026-01-06 07:24:46.802881	\N	Musteri fiyat sormak istiyor, bot cevap veremedi	7
10	+905554445566	open	\N	2026-01-06 06:54:46.802881	\N	Rezervasyon detaylari hakkinda yardim isteniyor	7
11	+905557778899	in_progress	\N	2026-01-06 05:54:46.802881	\N	Iptal talebi var, onay bekleniyor	7
\.


--
-- Data for Name: system_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_logs (id, level, source, message, details, phone, created_at, tenant_id) FROM stdin;
7	error	whatsapp	WhatsApp özel mesaj hatası	{\n  "error": "Cannot convert argument to a ByteString because the character at index 2 has a value of 351 which is greater than 255."\n}	\N	2026-01-07 08:19:26.747559	\N
\.


--
-- Data for Name: tenant_integrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_integrations (id, tenant_id, twilio_account_sid, twilio_auth_token_encrypted, twilio_whatsapp_number, twilio_webhook_url, twilio_configured, woocommerce_store_url, woocommerce_consumer_key, woocommerce_consumer_secret_encrypted, woocommerce_webhook_secret, woocommerce_configured, gmail_user, gmail_app_password_encrypted, gmail_from_name, gmail_configured, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, name, slug, contact_email, contact_phone, address, logo_url, primary_color, accent_color, timezone, language, is_active, created_at, updated_at, plan_code) FROM stdin;
2	Sky Fethiye	sky-fethiye	skyfethiye@gmail.com	05384944505	\N	\N	262 83% 58%	142 76% 36%	Europe/Istanbul	tr	t	2026-01-05 14:51:26.747834	2026-01-05 14:51:26.747834	trial
7	acenta	acenta	acenta@acenta.com	5555555555	\N	\N	262 83% 58%	142 76% 36%	Europe/Istanbul	tr	t	2026-01-06 07:11:00.929471	2026-01-06 07:11:00.929471	enterprise
8	Default Agency	default	admin@smartur.com	\N	\N	\N	262 83% 58%	142 76% 36%	Europe/Istanbul	tr	t	2026-01-06 14:41:58.125027	2026-01-06 14:41:58.125027	trial
\.


--
-- Data for Name: ticket_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_responses (id, ticket_id, responder_id, responder_name, content, is_internal, created_at) FROM stdin;
\.


--
-- Data for Name: user_login_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_login_logs (id, user_id, username, ip_address, user_agent, status, failure_reason, created_at) FROM stdin;
3	\N	flymet	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanici bulunamadi	2026-01-05 11:40:01.24759
5	\N	skyfethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanici bulunamadi	2026-01-05 14:52:05.944868
6	\N	Sky Fethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanici bulunamadi	2026-01-05 14:52:20.416619
7	2	Skyfethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-05 14:57:07.084535
8	2	Skyfethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-05 15:06:00.394705
9	2	Skyfethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-05 15:15:18.727128
10	2	Skyfethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-05 15:28:31.114656
11	2	Skyfethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-05 16:12:08.726778
12	2	Skyfethiye	172.31.101.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-05 16:24:25.66564
13	2	Skyfethiye	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-06 04:44:13.836414
14	2	Skyfethiye	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-06 04:55:33.758677
15	\N	test	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:57:44.155448
16	\N	testacenta	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:57:51.961763
17	\N	testacenta	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:57:53.44357
18	\N	acenta	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:57:58.382462
19	\N	test	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:58:19.718789
20	\N	test	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:58:22.374421
21	\N	test	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:58:28.791267
22	\N	Test	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:58:33.362969
23	\N	Test	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 04:58:35.047133
25	\N	Acenta	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Kullanıcı bulunamadı	2026-01-06 05:02:49.379655
29	2	Skyfethiye	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-06 06:55:51.062017
30	7	Acenta	172.31.67.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-06 07:11:11.059432
31	7	acenta	127.0.0.1	curl/8.14.1	failed	Yanlış şifre	2026-01-06 10:24:42.440174
32	9	isortagi2	172.31.85.194	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-07 07:15:05.510251
33	9	isortagi2	172.31.85.194	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-07 07:20:13.885933
34	2	Skyfethiye	172.31.85.194	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Yanlış şifre	2026-01-07 07:41:56.429988
35	2	skyfethiye@gmail.com	172.31.85.194	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	failed	Yanlış şifre	2026-01-07 07:42:05.492512
36	7	Acenta	172.31.85.194	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	success		2026-01-07 07:42:18.902628
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role_id, assigned_by, assigned_at) FROM stdin;
2	2	4	\N	2026-01-05 14:51:26.764741
7	7	4	\N	2026-01-06 07:11:00.957906
8	9	3	\N	2026-01-07 07:14:47.255932
\.


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activities_id_seq', 7, true);


--
-- Name: activity_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_costs_id_seq', 4, true);


--
-- Name: agencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agencies_id_seq', 5, true);


--
-- Name: agency_activity_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agency_activity_rates_id_seq', 1, false);


--
-- Name: agency_activity_terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agency_activity_terms_id_seq', 1, false);


--
-- Name: agency_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agency_notes_id_seq', 1, false);


--
-- Name: agency_payouts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agency_payouts_id_seq', 6, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.announcements_id_seq', 2, true);


--
-- Name: api_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_status_logs_id_seq', 1, false);


--
-- Name: app_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_users_id_seq', 9, true);


--
-- Name: app_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_versions_id_seq', 1, false);


--
-- Name: auto_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auto_responses_id_seq', 15, true);


--
-- Name: blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.blacklist_id_seq', 2, true);


--
-- Name: bot_quality_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bot_quality_scores_id_seq', 1, false);


--
-- Name: capacity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.capacity_id_seq', 8, true);


--
-- Name: customer_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_requests_id_seq', 8, true);


--
-- Name: daily_message_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_message_usage_id_seq', 1, false);


--
-- Name: database_backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.database_backups_id_seq', 2, true);


--
-- Name: error_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.error_events_id_seq', 1, false);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holidays_id_seq', 9, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 1, false);


--
-- Name: license_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.license_id_seq', 1, true);


--
-- Name: login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.login_logs_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 26, true);


--
-- Name: package_tour_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.package_tour_activities_id_seq', 5, true);


--
-- Name: package_tours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.package_tours_id_seq', 1, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 27, true);


--
-- Name: plan_features_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plan_features_id_seq', 11, true);


--
-- Name: platform_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.platform_admins_id_seq', 2, true);


--
-- Name: platform_support_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.platform_support_tickets_id_seq', 1, false);


--
-- Name: request_message_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.request_message_templates_id_seq', 12, true);


--
-- Name: reservation_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservation_requests_id_seq', 2, true);


--
-- Name: reservations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservations_id_seq', 16, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 61, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 21, true);


--
-- Name: settlement_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settlement_entries_id_seq', 1, false);


--
-- Name: settlements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settlements_id_seq', 6, true);


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_payments_id_seq', 1, false);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_plans_id_seq', 4, true);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, false);


--
-- Name: supplier_dispatches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_dispatches_id_seq', 2, true);


--
-- Name: support_request_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_request_logs_id_seq', 1, false);


--
-- Name: support_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_requests_id_seq', 13, true);


--
-- Name: system_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_logs_id_seq', 7, true);


--
-- Name: tenant_integrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenant_integrations_id_seq', 1, false);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenants_id_seq', 8, true);


--
-- Name: ticket_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ticket_responses_id_seq', 1, false);


--
-- Name: user_login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_login_logs_id_seq', 36, true);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 8, true);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_costs activity_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_costs
    ADD CONSTRAINT activity_costs_pkey PRIMARY KEY (id);


--
-- Name: agencies agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: agency_activity_rates agency_activity_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_pkey PRIMARY KEY (id);


--
-- Name: agency_activity_terms agency_activity_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_pkey PRIMARY KEY (id);


--
-- Name: agency_notes agency_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_pkey PRIMARY KEY (id);


--
-- Name: agency_payouts agency_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_payouts
    ADD CONSTRAINT agency_payouts_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: api_status_logs api_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_status_logs
    ADD CONSTRAINT api_status_logs_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_email_unique UNIQUE (email);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_username_unique UNIQUE (username);


--
-- Name: app_versions app_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_versions
    ADD CONSTRAINT app_versions_pkey PRIMARY KEY (id);


--
-- Name: auto_responses auto_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_responses
    ADD CONSTRAINT auto_responses_pkey PRIMARY KEY (id);


--
-- Name: blacklist blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_pkey PRIMARY KEY (id);


--
-- Name: bot_quality_scores bot_quality_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_quality_scores
    ADD CONSTRAINT bot_quality_scores_pkey PRIMARY KEY (id);


--
-- Name: capacity capacity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capacity
    ADD CONSTRAINT capacity_pkey PRIMARY KEY (id);


--
-- Name: customer_requests customer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_requests
    ADD CONSTRAINT customer_requests_pkey PRIMARY KEY (id);


--
-- Name: daily_message_usage daily_message_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_message_usage
    ADD CONSTRAINT daily_message_usage_pkey PRIMARY KEY (id);


--
-- Name: database_backups database_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.database_backups
    ADD CONSTRAINT database_backups_pkey PRIMARY KEY (id);


--
-- Name: error_events error_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_events
    ADD CONSTRAINT error_events_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: license license_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license
    ADD CONSTRAINT license_pkey PRIMARY KEY (id);


--
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: package_tour_activities package_tour_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_pkey PRIMARY KEY (id);


--
-- Name: package_tours package_tours_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tours
    ADD CONSTRAINT package_tours_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_key_unique UNIQUE (key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_key_unique UNIQUE (key);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_email_unique UNIQUE (email);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: platform_support_tickets platform_support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_pkey PRIMARY KEY (id);


--
-- Name: request_message_templates request_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_message_templates
    ADD CONSTRAINT request_message_templates_pkey PRIMARY KEY (id);


--
-- Name: reservation_requests reservation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: settlement_entries settlement_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: subscription_payments subscription_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_code_unique UNIQUE (code);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: supplier_dispatches supplier_dispatches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_pkey PRIMARY KEY (id);


--
-- Name: support_request_logs support_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_request_logs
    ADD CONSTRAINT support_request_logs_pkey PRIMARY KEY (id);


--
-- Name: support_requests support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: tenant_integrations tenant_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_pkey PRIMARY KEY (id);


--
-- Name: tenant_integrations tenant_integrations_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_tenant_id_unique UNIQUE (tenant_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: ticket_responses ticket_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_pkey PRIMARY KEY (id);


--
-- Name: user_login_logs user_login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: activities activities_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: activity_costs activity_costs_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_costs
    ADD CONSTRAINT activity_costs_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: activity_costs activity_costs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_costs
    ADD CONSTRAINT activity_costs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agencies agencies_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_activity_rates agency_activity_rates_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: agency_activity_rates agency_activity_rates_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: agency_activity_rates agency_activity_rates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_rates
    ADD CONSTRAINT agency_activity_rates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_activity_terms agency_activity_terms_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: agency_activity_terms agency_activity_terms_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: agency_activity_terms agency_activity_terms_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_activity_terms
    ADD CONSTRAINT agency_activity_terms_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_notes agency_notes_admin_id_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_admin_id_platform_admins_id_fk FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id);


--
-- Name: agency_notes agency_notes_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: agency_notes agency_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_notes
    ADD CONSTRAINT agency_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: agency_payouts agency_payouts_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_payouts
    ADD CONSTRAINT agency_payouts_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: agency_payouts agency_payouts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_payouts
    ADD CONSTRAINT agency_payouts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: app_users app_users_created_by_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_created_by_platform_admins_id_fk FOREIGN KEY (created_by) REFERENCES public.platform_admins(id);


--
-- Name: app_users app_users_plan_id_subscription_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_plan_id_subscription_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: app_users app_users_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: auto_responses auto_responses_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_responses
    ADD CONSTRAINT auto_responses_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: blacklist blacklist_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: bot_quality_scores bot_quality_scores_message_id_messages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_quality_scores
    ADD CONSTRAINT bot_quality_scores_message_id_messages_id_fk FOREIGN KEY (message_id) REFERENCES public.messages(id);


--
-- Name: bot_quality_scores bot_quality_scores_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_quality_scores
    ADD CONSTRAINT bot_quality_scores_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: capacity capacity_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capacity
    ADD CONSTRAINT capacity_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: capacity capacity_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capacity
    ADD CONSTRAINT capacity_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: customer_requests customer_requests_reservation_id_reservations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_requests
    ADD CONSTRAINT customer_requests_reservation_id_reservations_id_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: customer_requests customer_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_requests
    ADD CONSTRAINT customer_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: daily_message_usage daily_message_usage_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_message_usage
    ADD CONSTRAINT daily_message_usage_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: error_events error_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_events
    ADD CONSTRAINT error_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: holidays holidays_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: invoices invoices_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: invoices invoices_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: invoices invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: login_logs login_logs_admin_id_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_admin_id_platform_admins_id_fk FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id);


--
-- Name: messages messages_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: package_tour_activities package_tour_activities_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: package_tour_activities package_tour_activities_package_tour_id_package_tours_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_package_tour_id_package_tours_id_fk FOREIGN KEY (package_tour_id) REFERENCES public.package_tours(id);


--
-- Name: package_tour_activities package_tour_activities_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tour_activities
    ADD CONSTRAINT package_tour_activities_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: package_tours package_tours_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_tours
    ADD CONSTRAINT package_tours_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: payments payments_settlement_id_settlements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_settlement_id_settlements_id_fk FOREIGN KEY (settlement_id) REFERENCES public.settlements(id);


--
-- Name: payments payments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: platform_support_tickets platform_support_tickets_assigned_to_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_assigned_to_platform_admins_id_fk FOREIGN KEY (assigned_to) REFERENCES public.platform_admins(id);


--
-- Name: platform_support_tickets platform_support_tickets_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: platform_support_tickets platform_support_tickets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_support_tickets
    ADD CONSTRAINT platform_support_tickets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: request_message_templates request_message_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_message_templates
    ADD CONSTRAINT request_message_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: reservation_requests reservation_requests_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: reservation_requests reservation_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.app_users(id);


--
-- Name: reservation_requests reservation_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.app_users(id);


--
-- Name: reservation_requests reservation_requests_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: reservation_requests reservation_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_requests
    ADD CONSTRAINT reservation_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: reservations reservations_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: reservations reservations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: role_permissions role_permissions_permission_id_permissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_permissions_id_fk FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: settings settings_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: settlement_entries settlement_entries_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: settlement_entries settlement_entries_reservation_id_reservations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_reservation_id_reservations_id_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: settlement_entries settlement_entries_settlement_id_settlements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_settlement_id_settlements_id_fk FOREIGN KEY (settlement_id) REFERENCES public.settlements(id);


--
-- Name: settlement_entries settlement_entries_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_entries
    ADD CONSTRAINT settlement_entries_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: settlements settlements_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: settlements settlements_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: subscription_payments subscription_payments_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: subscriptions subscriptions_license_id_license_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_license_id_license_id_fk FOREIGN KEY (tenant_id) REFERENCES public.license(id);


--
-- Name: subscriptions subscriptions_plan_id_subscription_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_subscription_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: subscriptions subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: supplier_dispatches supplier_dispatches_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: supplier_dispatches supplier_dispatches_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id);


--
-- Name: supplier_dispatches supplier_dispatches_payout_id_agency_payouts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_payout_id_agency_payouts_id_fk FOREIGN KEY (payout_id) REFERENCES public.agency_payouts(id);


--
-- Name: supplier_dispatches supplier_dispatches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_dispatches
    ADD CONSTRAINT supplier_dispatches_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: support_request_logs support_request_logs_log_id_system_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_request_logs
    ADD CONSTRAINT support_request_logs_log_id_system_logs_id_fk FOREIGN KEY (log_id) REFERENCES public.system_logs(id);


--
-- Name: support_request_logs support_request_logs_support_request_id_support_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_request_logs
    ADD CONSTRAINT support_request_logs_support_request_id_support_requests_id_fk FOREIGN KEY (support_request_id) REFERENCES public.support_requests(id);


--
-- Name: support_requests support_requests_reservation_id_reservations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_reservation_id_reservations_id_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: support_requests support_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: system_logs system_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_integrations tenant_integrations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: ticket_responses ticket_responses_responder_id_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_responder_id_platform_admins_id_fk FOREIGN KEY (responder_id) REFERENCES public.platform_admins(id);


--
-- Name: ticket_responses ticket_responses_ticket_id_platform_support_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_responses
    ADD CONSTRAINT ticket_responses_ticket_id_platform_support_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.platform_support_tickets(id);


--
-- Name: user_login_logs user_login_logs_user_id_app_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_user_id_app_users_id_fk FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: user_roles user_roles_assigned_by_platform_admins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_platform_admins_id_fk FOREIGN KEY (assigned_by) REFERENCES public.platform_admins(id);


--
-- Name: user_roles user_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_app_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_app_users_id_fk FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict QJN0MJh2QyaeA33vZWpk2h3gk6jPAO7FIA8b6DUyATQpU2NlY92isU42Laa2cKt

