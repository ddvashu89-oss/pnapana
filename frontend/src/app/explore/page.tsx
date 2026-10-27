'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Plus, Check, ShoppingBag, Sprout } from 'lucide-react';
import { getPlantImageUrl, handlePlantImageError } from '@/lib/plantImages';
import styles from './Explore.module.css';

const MARKET_PLANTS = [
  {
    id: 'm1',
    name: 'Yellow Rose',
    price: '$6.00 – $14.23',
    img: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=350&q=80',
    species: 'Rosa foetida',
    family: 'Rosaceae'
  },
  {
    id: 'm2',
    name: 'Echeveria',
    price: '$23.00 – $50.23',
    img: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=350&q=80',
    species: 'Echeveria elegans',
    family: 'Crassulaceae'
  },
  {
    id: 'm3',
    name: 'Pink Gerbera',
    price: '$8.50 – $16.00',
    img: 'https://images.unsplash.com/photo-1572454591674-2739f30d8c40?w=350&q=80',
    species: 'Gerbera jamesonii',
    family: 'Asteraceae'
  },
  {
    id: 'm4',
    name: 'Nest Fern',
    price: '$12.00 – $24.50',
    img: 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=350&q=80',
    species: 'Asplenium nidus',
    family: 'Aspleniaceae'
  },
  {
    id: 'm5',
    name: 'Young Banana',
    price: '$15.00 – $29.00',
    img: 'https://images.unsplash.com/photo-1567689265664-1c48de61db0b?w=350&q=80',
    species: 'Musa acuminata',
    family: 'Musaceae'
  },
  {
    id: 'm6',
    name: 'Dahlia',
    price: '$7.00 – $18.00',
    img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=350&q=80',
    species: 'Dahlia pinnata',
    family: 'Asteraceae'
  },
  {
    id: 'm7',
    name: 'Artificial Jade',
    price: '$18.00 – $35.00',
    img: 'https://images.unsplash.com/photo-1503149779833-1de50ebe5f8a?w=350&q=80',
    species: 'Crassula ovata',
    family: 'Crassulaceae'
  },
  {
    id: 'm8',
    name: 'Sempervivum',
    price: '$9.00 – $19.00',
    img: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=350&q=80',
    species: 'Sempervivum tectorum',
    family: 'Crassulaceae'
  }
];

const ACCESSORIES = [
  {
    id: 'a1',
    name: 'Vibes Fold Pot',
    price: '$9.59 – $14.23',
    img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=350&q=80',
    category: 'Ceramic Planter'
  },
  {
    id: 'a2',
    name: 'Brussels Planter',
    price: '$2.69 – $8.00',
    img: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=350&q=80',
    category: 'Minimal Matte Pot'
  },
  {
    id: 'a3',
    name: 'Vibes Coupe',
    price: '$11.20 – $19.50',
    img: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=350&q=80',
    category: 'Pedestal Planter'
  },
  {
    id: 'a4',
    name: 'Campana Hanger',
    price: '$14.00 – $28.00',
    img: 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=350&q=80',
    category: 'Hanging Pot'
  }
];

export default function ExploreMarketPage() {
  const [activeTab, setActiveTab] = useState<'plants' | 'accessories'>('plants');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAdd = (id: string) => {
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const list = activeTab === 'plants' ? MARKET_PLANTS : ACCESSORIES;
    if (!searchQuery.trim()) return list;
    return list.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, searchQuery]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.topRow}>
          <div>
            <h1>Plants Market</h1>
            <p style={{ color: '#557061', fontSize: '0.94rem' }}>
              Curated botanical collections &amp; minimalist ceramic accessories.
            </p>
          </div>

          <div className={styles.searchBar}>
            <Search size={18} color="#8da295" />
            <input
              type="text"
              placeholder="Search plants, pots, or planters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Featured Banner (Matching Mockup) */}
      <div className={styles.marketBanner}>
        <div className={styles.bannerText}>
          <div className={styles.bannerTag}>Plant home</div>
          <div className={styles.bannerTitle}>New Collection</div>
          <div className={styles.bannerSub}>789+ new plants &amp; accessories added this week</div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=350&q=80"
          alt="New Collection"
          className={styles.bannerPlantImg}
        />
      </div>

      {/* Segmented Tabs: Plants • / Accessories */}
      <div className={styles.tabsRow}>
        <button
          className={activeTab === 'plants' ? styles.tabBtnActive : styles.tabBtnInactive}
          onClick={() => setActiveTab('plants')}
        >
          Plants {activeTab === 'plants' && <span className={styles.tabDot} />}
        </button>
        <button
          className={activeTab === 'accessories' ? styles.tabBtnActive : styles.tabBtnInactive}
          onClick={() => setActiveTab('accessories')}
        >
          Accessories {activeTab === 'accessories' && <span className={styles.tabDot} />}
        </button>
      </div>

      {/* Product Grid */}
      <div className={styles.productGrid}>
        {filteredItems.map((item) => {
          const isAdded = addedIds.has(item.id);
          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              key={item.id}
              className={styles.productCard}
            >
              <div className={styles.productImgWrap}>
                <img
                  src={getPlantImageUrl(item.img, item.name)}
                  alt={item.name}
                  className={styles.productImg}
                  onError={handlePlantImageError}
                  loading="lazy"
                />
              </div>
              <div className={styles.productTitle}>{item.name}</div>
              <div className={styles.productPrice}>{item.price}</div>

              <button
                className={styles.addToGardenBtn}
                onClick={() => handleAdd(item.id)}
              >
                {isAdded ? (
                  <>
                    <Check size={14} /> Added to Garden
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add to Garden
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
