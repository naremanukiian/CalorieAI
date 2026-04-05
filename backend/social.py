"""
social.py — Phase 2 Social Features
Routes: follow, posts, feed, likes, saves, explore
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import psycopg2.extras
from auth import get_current_user
from database import get_db

router = APIRouter()


# ── Follow / Unfollow ──────────────────────────────

@router.post("/follow/{target_id}")
def follow_user(target_id: int, current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    if user_id == target_id:
        raise HTTPException(400, "Cannot follow yourself.")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE id=%s", (target_id,))
            if not cur.fetchone():
                raise HTTPException(404, "User not found.")
            cur.execute(
                "INSERT INTO follows (follower_id,following_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (user_id, target_id)
            )
    return {"message": "Followed."}


@router.delete("/follow/{target_id}")
def unfollow_user(target_id: int, current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM follows WHERE follower_id=%s AND following_id=%s",
                (user_id, target_id)
            )
    return {"message": "Unfollowed."}


@router.get("/followers/{user_id}")
def get_followers(user_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT u.id, u.email, f.created_at
                FROM follows f JOIN users u ON u.id = f.follower_id
                WHERE f.following_id = %s ORDER BY f.created_at DESC
            """, (user_id,))
            rows = [dict(r) for r in cur.fetchall()]
    return {"followers": rows, "count": len(rows)}


@router.get("/following/{user_id}")
def get_following(user_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT u.id, u.email, f.created_at
                FROM follows f JOIN users u ON u.id = f.following_id
                WHERE f.follower_id = %s ORDER BY f.created_at DESC
            """, (user_id,))
            rows = [dict(r) for r in cur.fetchall()]
    return {"following": rows, "count": len(rows)}


# ── Posts ──────────────────────────────────────────

@router.post("/posts")
def create_post(body: dict, current_user: dict = Depends(get_current_user)):
    user_id    = int(current_user["sub"])
    session_id = body.get("session_id")
    caption    = body.get("caption", "")
    privacy    = body.get("privacy", "public")  # public | followers | private

    if privacy not in ("public", "followers", "private"):
        privacy = "public"

    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Get session data
            cur.execute("""
                SELECT ms.*, array_agg(
                    json_build_object(
                        'food_name', fl.food_name,
                        'calories', fl.calories,
                        'carbs', fl.carbs,
                        'fat', fl.fat,
                        'protein', fl.protein,
                        'serving', fl.serving
                    )
                ) as items
                FROM meal_sessions ms
                LEFT JOIN food_logs fl ON fl.session_id = ms.id
                WHERE ms.id = %s AND ms.user_id = %s
                GROUP BY ms.id
            """, (session_id, user_id))
            session = cur.fetchone()
            if not session:
                raise HTTPException(404, "Meal session not found.")

            cur.execute("""
                INSERT INTO posts
                  (user_id, session_id, caption, privacy,
                   meal_type, total_calories, total_carbs, total_fat, total_protein,
                   food_summary, items_json)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
            """, (
                user_id, session_id, caption, privacy,
                session["meal_type"],
                session["total_calories"], session["total_carbs"],
                session["total_fat"], session["total_protein"],
                session["food_summary"],
                psycopg2.extras.Json(session["items"] or [])
            ))
            post_id = cur.fetchone()["id"]

    return {"post_id": post_id, "message": "Posted to your profile!"}


@router.get("/posts/feed")
def get_feed(limit: int = 20, offset: int = 0, current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.*, u.email as author_email,
                       EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=%s) as liked,
                       EXISTS(SELECT 1 FROM saves s WHERE s.post_id=p.id AND s.user_id=%s) as saved,
                       (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as like_count,
                       (SELECT COUNT(*) FROM saves WHERE post_id=p.id) as save_count
                FROM posts p
                JOIN users u ON u.id = p.user_id
                WHERE (
                    p.user_id = %s
                    OR (p.privacy = 'public')
                    OR (p.privacy = 'followers' AND EXISTS(
                        SELECT 1 FROM follows f WHERE f.follower_id=%s AND f.following_id=p.user_id
                    ))
                )
                ORDER BY p.created_at DESC
                LIMIT %s OFFSET %s
            """, (user_id, user_id, user_id, user_id, limit, offset))
            posts = [dict(r) for r in cur.fetchall()]

    # Serialize
    for p in posts:
        if p.get("created_at"):
            p["created_at"] = p["created_at"].isoformat()
        if p.get("items_json") and not isinstance(p["items_json"], list):
            import json
            try: p["items_json"] = json.loads(p["items_json"])
            except: p["items_json"] = []

    return {"posts": posts, "count": len(posts)}


@router.get("/posts/profile/{user_id}")
def get_profile_posts(user_id: int, current_user: dict = Depends(get_current_user)):
    me = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.*, u.email as author_email,
                       EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=%s) as liked,
                       (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as like_count
                FROM posts p JOIN users u ON u.id = p.user_id
                WHERE p.user_id = %s
                  AND (p.privacy='public' OR p.user_id=%s)
                ORDER BY p.created_at DESC LIMIT 50
            """, (me, user_id, me))
            posts = [dict(r) for r in cur.fetchall()]
    for p in posts:
        if p.get("created_at"): p["created_at"] = p["created_at"].isoformat()
    return {"posts": posts}


@router.get("/posts/explore")
def get_explore(limit: int = 30, offset: int = 0,
                min_cal: int = 0, max_cal: int = 9999,
                meal_type: str = "", search: str = "",
                current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            filters = ["p.privacy='public'",
                       "p.total_calories >= %s", "p.total_calories <= %s"]
            params  = [min_cal, max_cal]
            if meal_type:
                filters.append("p.meal_type = %s")
                params.append(meal_type)
            if search:
                filters.append("(p.food_summary ILIKE %s OR p.caption ILIKE %s)")
                params += [f"%{search}%", f"%{search}%"]
            params += [user_id, user_id, limit, offset]
            cur.execute(f"""
                SELECT p.*, u.email as author_email,
                       EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=%s) as liked,
                       EXISTS(SELECT 1 FROM saves s WHERE s.post_id=p.id AND s.user_id=%s) as saved,
                       (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as like_count
                FROM posts p JOIN users u ON u.id = p.user_id
                WHERE {' AND '.join(filters)}
                ORDER BY like_count DESC, p.created_at DESC
                LIMIT %s OFFSET %s
            """, params)
            posts = [dict(r) for r in cur.fetchall()]
    for p in posts:
        if p.get("created_at"): p["created_at"] = p["created_at"].isoformat()
    return {"posts": posts, "count": len(posts)}


# ── Likes ──────────────────────────────────────────

@router.post("/posts/{post_id}/like")
def like_post(post_id: int, current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO likes (user_id,post_id) VALUES (%s,%s) ON CONFLICT DO NOTHING RETURNING id",
                (user_id, post_id)
            )
            liked = cur.fetchone() is not None
            cur.execute("SELECT COUNT(*) FROM likes WHERE post_id=%s", (post_id,))
            count = cur.fetchone()[0]
    return {"liked": liked, "like_count": count}


@router.delete("/posts/{post_id}/like")
def unlike_post(post_id: int, current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM likes WHERE user_id=%s AND post_id=%s", (user_id, post_id))
            cur.execute("SELECT COUNT(*) FROM likes WHERE post_id=%s", (post_id,))
            count = cur.fetchone()[0]
    return {"liked": False, "like_count": count}


# ── Saves ──────────────────────────────────────────

@router.post("/posts/{post_id}/save")
def save_post(post_id: int, current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO saves (user_id,post_id) VALUES (%s,%s) ON CONFLICT DO NOTHING RETURNING id",
                (user_id, post_id)
            )
            saved = cur.fetchone() is not None
    return {"saved": saved}


@router.delete("/posts/{post_id}/save")
def unsave_post(post_id: int, current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM saves WHERE user_id=%s AND post_id=%s", (user_id, post_id))
    return {"saved": False}


@router.get("/posts/saved")
def get_saved(current_user: dict = Depends(get_current_user)):
    user_id = int(current_user["sub"])
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.*, u.email as author_email,
                       (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as like_count
                FROM saves s
                JOIN posts p ON p.id = s.post_id
                JOIN users u ON u.id = p.user_id
                WHERE s.user_id=%s ORDER BY s.created_at DESC
            """, (user_id,))
            posts = [dict(r) for r in cur.fetchall()]
    for p in posts:
        if p.get("created_at"): p["created_at"] = p["created_at"].isoformat()
    return {"posts": posts}
