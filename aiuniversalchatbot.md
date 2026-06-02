## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `full_name` | `text` |  Nullable |
| `plan` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `websites`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `url` | `text` |  |
| `api_key` | `text` |  Unique |
| `status` | `text` |  |
| `widget_color` | `text` |  |
| `widget_name` | `text` |  |
| `widget_greeting` | `text` |  |
| `widget_position` | `text` |  |
| `last_crawled_at` | `timestamptz` |  Nullable |
| `pages_indexed` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `website_pages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `website_id` | `uuid` |  |
| `url` | `text` |  |
| `title` | `text` |  Nullable |
| `content` | `text` |  Nullable |
| `crawled_at` | `timestamptz` |  |

## Table `embeddings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `website_id` | `uuid` |  |
| `page_id` | `uuid` |  |
| `chunk_text` | `text` |  |
| `chunk_index` | `int4` |  |
| `embedding` | `vector` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `chat_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `website_id` | `uuid` |  |
| `visitor_id` | `text` |  |
| `language` | `text` |  Nullable |
| `started_at` | `timestamptz` |  |
| `last_msg_at` | `timestamptz` |  |

## Table `messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `uuid` |  |
| `website_id` | `uuid` |  |
| `role` | `text` |  |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `leads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `website_id` | `uuid` |  |
| `session_id` | `uuid` |  Nullable |
| `name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `usage_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `website_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `message_count` | `int4` |  |
| `tokens_used` | `int4` |  Nullable |
| `logged_date` | `date` |  |

## Table `widget_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `website_id` | `uuid` |  Unique |
| `avatar_url` | `text` |  Nullable |
| `greeting_message` | `text` |  Nullable |
| `position` | `text` |  Nullable |
| `theme` | `text` |  Nullable |
| `primary_color` | `text` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `page_crawl_metadata`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `page_id` | `uuid` |  Unique |
| `is_deleted` | `int4` |  Nullable |
| `last_recrawl_at` | `timestamp` |  Nullable |
| `crawl_count` | `int4` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

