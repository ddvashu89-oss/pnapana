'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Loader from '@/components/Loader';
import { authFetch } from '@/lib/api';
import styles from './Community.module.css';

type Post = {
  id: number;
  user_id: number;
  user_name: string;
  plant_id: number | null;
  plant_name: string | null;
  caption: string;
  image_url: string | null;
  likes_count: number;
  liked_by_me: boolean;
  coins_earned: number;
  created_at: string;
};

type Plant = { id: number; name: string; image_url: string };

export default function Community() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<{ id: number, name: string, token?: string } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPlants, setMyPlants] = useState<Plant[]>([]);
  const [coins, setCoins] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [justEarned, setJustEarned] = useState<number | null>(null);
  const [likingIds, setLikingIds] = useState<Set<number>>(new Set());

  function fetchPosts() {
    authFetch('get_community_posts.php')
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setPosts(data.posts); })
      .finally(() => setIsLoading(false));
  }

  function fetchMyPlants() {
    authFetch('get_plants.php')
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setMyPlants(data.plants); })
      .catch(() => {});
  }

  function fetchCoins() {
    authFetch('get_gamification.php')
      .then(res => res.json())
      .then(data => { if (data.status === 'success') setCoins(data.coins); })
      .catch(() => {});
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchPosts();
    fetchMyPlants();
    fetchCoins();
  }, [router]);

  function openComposer() {
    setSelectedPlantId('');
    setCaption('');
    setImageUrl('');
    setIsComposerOpen(true);
  }

  function handlePlantSelect(id: string) {
    setSelectedPlantId(id);
    const plant = myPlants.find(p => String(p.id) === id);
    if (plant && !imageUrl) setImageUrl(plant.image_url || '');
  }

  async function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() || !user) return;
    setIsPosting(true);
    try {
      const selectedPlant = myPlants.find(p => String(p.id) === selectedPlantId);
      const res = await authFetch('create_post.php', {
        method: 'POST',
        body: JSON.stringify({
          plant_id: selectedPlantId || null,
          plant_name: selectedPlant?.name || null,
          caption: caption.trim(),
          image_url: imageUrl || null
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPosts(prev => [{
          id: data.post_id,
          user_id: user.id,
          user_name: user.name,
          plant_id: selectedPlant ? selectedPlant.id : null,
          plant_name: selectedPlant?.name || null,
          caption: caption.trim(),
          image_url: imageUrl || null,
          likes_count: 0,
          liked_by_me: false,
          coins_earned: data.coins_earned,
          created_at: new Date().toISOString()
        }, ...prev]);
        setCoins(data.coins);
        setJustEarned(data.coins_earned);
        setTimeout(() => setJustEarned(null), 2500);
        setIsComposerOpen(false);
      }
    } catch (err) {
      console.error('Failed to create post', err);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleToggleLike(post: Post) {
    if (!user || likingIds.has(post.id)) return;
    setLikingIds(prev => new Set(prev).add(post.id));

    const wasLiked = post.liked_by_me;
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, liked_by_me: !wasLiked, likes_count: p.likes_count + (wasLiked ? -1 : 1) }
      : p));

    try {
      const res = await authFetch('like_post.php', {
        method: 'POST',
        body: JSON.stringify({ post_id: post.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPosts(prev => prev.map(p => p.id === post.id
          ? { ...p, liked_by_me: data.liked, likes_count: data.likes_count }
          : p));
      } else {
        setPosts(prev => prev.map(p => p.id === post.id
          ? { ...p, liked_by_me: wasLiked, likes_count: post.likes_count }
          : p));
      }
    } catch (err) {
      console.error('Failed to toggle like', err);
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, liked_by_me: wasLiked, likes_count: post.likes_count }
        : p));
    } finally {
      setLikingIds(prev => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  }

  if (!user) return <Loader fullScreen label={t('common.loading')} />;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>{t('community.title')}</h1>
          <p className={styles.subtitle}>{t('community.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.coinPill}>
            🪙 <span>{coins}</span>
          </div>
          <button className={styles.shareBtn} onClick={openComposer}>{t('community.sharePlant')}</button>
        </div>
      </header>

      {justEarned !== null && (
        <motion.div
          className={styles.earnedToast}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          🪙 {t('community.coinsEarned', { coins: justEarned })}
        </motion.div>
      )}

      <main className={styles.content}>
        {isLoading ? (
          <div style={{ marginTop: '3rem' }}><Loader label={t('community.loading')} /></div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t('community.emptyLine1')}</p>
            <p>{t('community.emptyLine2')}</p>
            <button className={styles.shareBtn} onClick={openComposer}>{t('community.sharePlant')}</button>
          </div>
        ) : (
          <motion.div className={styles.feed} variants={staggerContainer} initial="hidden" animate="visible">
            {posts.map(post => (
              <motion.article key={post.id} className={styles.postCard} variants={fadeInUp}>
                <div className={styles.postHeader}>
                  <img
                    className={styles.avatar}
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.user_name)}&background=307c46&color=fff&size=64`}
                    alt={post.user_name}
                  />
                  <div className={styles.postAuthor}>
                    <strong>{post.user_name}</strong>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  {post.plant_name && <span className={styles.plantTag}>🌿 {post.plant_name}</span>}
                </div>

                {post.image_url && (
                  <div className={styles.postImageWrap}>
                    <img src={post.image_url} alt={post.plant_name || 'Plant'} className={styles.postImage} />
                  </div>
                )}

                <p className={styles.postCaption}>{post.caption}</p>

                <div className={styles.postFooter}>
                  <button
                    className={`${styles.likeBtn} ${post.liked_by_me ? styles.liked : ''}`}
                    onClick={() => handleToggleLike(post)}
                  >
                    <Heart size={18} fill={post.liked_by_me ? 'currentColor' : 'none'} />
                    <span>{post.likes_count}</span>
                  </button>
                  <span className={styles.coinsTag}>🪙 +{post.coins_earned}</span>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </main>

      {isComposerOpen && (
        <motion.div
          className={styles.modalOverlay}
          onClick={() => setIsComposerOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" className={styles.closeBtn} onClick={() => setIsComposerOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2>{t('community.composerTitle')}</h2>
            <form onSubmit={handleSubmitPost}>
              <div className={styles.inputGroup}>
                <label>{t('community.pickPlantLabel')}</label>
                <select value={selectedPlantId} onChange={e => handlePlantSelect(e.target.value)}>
                  <option value="">{t('community.pickPlantNone')}</option>
                  {myPlants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>{t('community.captionLabel')}</label>
                <textarea
                  required
                  rows={3}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder={t('community.captionPlaceholder')}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>{t('community.imageUrlLabel')}</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder={t('community.imageUrlPlaceholder')}
                />
                {imageUrl && <img src={imageUrl} alt="Preview" className={styles.imagePreview} />}
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isPosting}>
                {isPosting ? t('community.posting') : t('community.postAndEarn')}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
