'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Droplets, 
  Check, 
  Plus, 
  Sparkles, 
  Search,
  SunMedium
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { getPlantImageUrl, handlePlantImageError } from '@/lib/plantImages';
import styles from './Care.module.css';

interface PlantTask {
  id: string;
  name: string;
  species: string;
  image: string;
  task: string;
  time: string;
  cycle: string;
  completed: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DEFAULT_DAYS = [
  { day: 'Sun', date: 20, hasWater: false },
  { day: 'Mon', date: 21, hasWater: true },
  { day: 'Tue', date: 22, hasWater: false },
  { day: 'Wed', date: 23, hasWater: true },
  { day: 'Thu', date: 24, hasWater: true },
  { day: 'Fri', date: 25, hasWater: false },
  { day: 'Sat', date: 26, hasWater: true },
];

const INITIAL_TASKS: PlantTask[] = [
  {
    id: 'demo-1',
    name: 'Yellow Rose',
    species: 'Rosa chinensis',
    image: 'https://images.unsplash.com/photo-1533616688419-b7a585564566?w=500&q=80',
    task: 'Watering',
    time: '10:00 AM',
    cycle: 'Every 2 days',
    completed: false,
  },
  {
    id: 'demo-2',
    name: 'Young Banana',
    species: 'Musa acuminata',
    image: 'https://images.unsplash.com/photo-1567689265664-1c48de61db0b?w=500&q=80',
    task: 'Watering & Mist',
    time: '11:30 AM',
    cycle: 'Every 3 days',
    completed: false,
  },
  {
    id: 'demo-3',
    name: 'Nest Fern',
    species: 'Asplenium nidus',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=500&q=80',
    task: 'Misting leaves',
    time: '02:00 PM',
    cycle: 'Daily morning',
    completed: true,
  },
  {
    id: 'demo-4',
    name: 'Aloe Vera',
    species: 'Aloe barbadensis',
    image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=500&q=80',
    task: 'Sunlight Rotation',
    time: '04:00 PM',
    cycle: 'Every 7 days',
    completed: false,
  },
];

export default function CareSchedule() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState('Mar');
  const [activeDateIndex, setActiveDateIndex] = useState(3); // 23 Wed
  const [tasks, setTasks] = useState<PlantTask[]>(INITIAL_TASKS);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    // Attempt to merge live user plants
    authFetch('get_plants.php')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && Array.isArray(data.plants) && data.plants.length > 0) {
          const liveTasks: PlantTask[] = data.plants.map((p: any, idx: number) => ({
            id: `plant-${p.id || idx}`,
            name: p.name || 'Unnamed Botanical',
            species: p.species || 'Foliage Specimen',
            image: p.image_url || 'https://images.unsplash.com/photo-1548625361-195fe5795df5?w=500&q=80',
            task: p.water_requirement ? `Water: ${p.water_requirement}` : 'Watering',
            time: '10:00 AM',
            cycle: p.watering_cycle || 'Every 3 days',
            completed: false,
          }));
          setTasks(liveTasks);
        }
      })
      .catch(() => {});
  }, [router]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => router.push('/dashboard')}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} />
        </button>

        <div className={styles.headerCenter}>
          <h1>Your Plants Calendar</h1>
          <div className={styles.subtitlePill}>
            <CalendarIcon size={13} color="#22c55e" />
            <span>Today 23 {selectedMonth}</span>
          </div>
        </div>

        <button
          className={styles.iconBtn}
          onClick={() => router.push('/dashboard#plants')}
          aria-label="Search or view plants"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Month Selector Pills */}
      <div className={styles.monthRow}>
        {MONTHS.map((m) => {
          const isActive = m === selectedMonth;
          return (
            <button
              key={m}
              className={`${styles.monthPill} ${isActive ? styles.monthPillActive : ''}`}
              onClick={() => setSelectedMonth(m)}
            >
              {m} {isActive && '•'}
            </button>
          );
        })}
      </div>

      {/* Day Cards Row */}
      <div className={styles.dayRow}>
        {DEFAULT_DAYS.map((d, idx) => {
          const isActive = idx === activeDateIndex;
          return (
            <div
              key={idx}
              className={`${styles.dayCard} ${isActive ? styles.dayCardActive : ''}`}
              onClick={() => setActiveDateIndex(idx)}
            >
              <span className={styles.dayNumber}>{d.date}</span>
              <span className={styles.dayWeekday}>{d.day}</span>
              {d.hasWater && (
                <div className={styles.waterDropBadge} title="Care task scheduled">
                  <Droplets size={12} strokeWidth={2.4} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tasks Section */}
      <div className={styles.tasksHeader}>
        <h2>Care Tasks for Today</h2>
        <span className={styles.tasksCount}>
          {completedCount} / {tasks.length} Done
        </span>
      </div>

      <div className={styles.taskList}>
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`${styles.taskCard} ${task.completed ? styles.taskCardCompleted : ''}`}
            >
              <div className={styles.plantThumbBox}>
                <img
                  src={getPlantImageUrl(task.image, task.name)}
                  alt={task.name}
                  onError={handlePlantImageError}
                  loading="lazy"
                />
              </div>

              <div className={styles.taskInfo}>
                <h3 className={styles.plantName}>{task.name}</h3>
                <p className={styles.plantSpecies}>{task.species}</p>
                <div className={styles.taskMetaPill}>
                  <Droplets size={12} color="#16a34a" />
                  <span>
                    {task.task} • {task.time}
                  </span>
                </div>
              </div>

              <button
                className={`${styles.checkToggleBtn} ${
                  task.completed ? styles.checkToggleBtnCompleted : ''
                }`}
                onClick={() => toggleTask(task.id)}
                title={task.completed ? 'Mark pending' : 'Mark completed'}
              >
                <Check size={18} strokeWidth={2.8} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Action Banner */}
      <div className={styles.actionBanner}>
        <div className={styles.actionBannerText}>
          <h3>Need care recommendations?</h3>
          <p>Scan with Pnapana Botanical Lens to auto-schedule light and water intervals.</p>
        </div>
        <Link href="/dashboard#scan" className={styles.actionBannerBtn}>
          <Sparkles size={16} />
          <span>Scan Plant</span>
        </Link>
      </div>
    </div>
  );
}
