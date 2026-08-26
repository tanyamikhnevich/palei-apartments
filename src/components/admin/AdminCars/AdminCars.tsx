'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import DateRangeCalendar from '@/components/DateRangeCalendar/DateRangeCalendar';
import AdminCarModal from './AdminCarModal';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';
import { formatDateRange } from '@/lib/dates';
import { blockCarDates, deleteCar, fetchCars, freeCarDates, saveCar } from '@/lib/api/client';
import { cars as builtInFleet } from '@/data/cars';
import type { Car } from '@/types/car';
import styles from './AdminCars.module.scss';

/**
 * The fleet screen: the cars themselves, and the calendar that says when each
 * one is out. Blocks are edited per car rather than on one big grid — a fleet
 * this size is read car by car, and the range picker is the same component the
 * guest books with.
 */
export default function AdminCars() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDb, setFromDb] = useState(false);
  const [writable, setWritable] = useState(false);
  const [editing, setEditing] = useState<Car | null | undefined>(undefined);
  const [openCarId, setOpenCarId] = useState<string | null>(null);
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () =>
    fetchCars()
      .then(({ cars: list, fromDb: db, writable: canWrite }) => {
        setCars(list);
        setFromDb(db);
        setWritable(canWrite);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  const openCar = useMemo(() => cars.find((c) => c.id === openCarId) ?? null, [cars, openCarId]);

  /*
    Writes need the tables, not rows in them — an empty fleet is still editable,
    it is just showing the built-in sample until the first car is saved.
  */
  const persist = async (action: () => Promise<void>) => {
    if (!writable) {
      alert(
        'The fleet is read-only until its tables exist.\n\nRun:  npm run db:cars:migrate'
      );
      return;
    }
    setBusy(true);
    try {
      await action();
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fleet database error');
    } finally {
      setBusy(false);
    }
  };

  const addBlock = () => {
    if (!openCar || !range.from || !range.to || range.to <= range.from) return;
    void persist(async () => {
      await blockCarDates({ carId: openCar.id, from: range.from!, to: range.to!, note });
      setRange({ from: null, to: null });
      setNote('');
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <h2 className={styles.title}>
          Fleet <span className={styles.count}>{cars.length}</span>
        </h2>
        {!fromDb && writable && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              void persist(async () => {
                for (const car of builtInFleet) await saveCar(car);
              })
            }
          >
            Copy sample fleet in
          </Button>
        )}
        <Button variant="primary" size="sm" icon="plus" onClick={() => setEditing(null)}>
          Add car
        </Button>
      </div>

      {!fromDb && !loading && (
        <p className={styles.notice}>
          <Icon name="shield" size={16} />
          {writable ? (
            <>
              The fleet is empty, so the sample from <code>src/data/cars.ts</code> is standing in.
              Add a car — or copy the sample in to start from it.
            </>
          ) : (
            <>
              Showing the built-in fleet from <code>src/data/cars.ts</code>. To edit cars here,
              create the fleet tables: <code>npm run db:cars:migrate</code>
            </>
          )}
        </p>
      )}

      {loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <div className={styles.list}>
          {cars.map((car) => {
            const money = (n: number) => formatMoney(n, currencyOf(car), 'en');
            const open = openCarId === car.id;
            return (
              <article className={styles.car} key={car.id}>
                <div className={styles.carHead}>
                  <div className={styles.carName}>
                    <b>
                      {car.make} {car.model}
                    </b>
                    <span>
                      {car.year} · {car.carClass} · {car.seats} seats · {car.area}
                    </span>
                  </div>
                  <div className={styles.carPrice}>
                    {money(car.pricePerDay)} <span>/ day</span>
                  </div>
                  <div className={styles.carActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => setOpenCarId(open ? null : car.id)}
                      aria-expanded={open}
                    >
                      <Icon name="calendar" size={16} />
                      {car.blocks.length > 0 && (
                        <span className={styles.badge}>{car.blocks.length}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => setEditing(car)}
                      aria-label="Edit"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => {
                        if (confirm(`Delete ${car.make} ${car.model}?`)) {
                          void persist(() => deleteCar(car.id));
                        }
                      }}
                      aria-label="Delete"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className={styles.calendar}>
                    <div className={styles.calendarPicker}>
                      <DateRangeCalendar
                        locale="en"
                        hint={
                          range.from && range.to
                            ? `Blocking ${formatDateRange(range.from, range.to, 'en')}`
                            : 'Pick the first and last day the car is out'
                        }
                        blocked={car.blocks.map((b) => ({ checkIn: b.from, checkOut: b.to }))}
                        checkIn={range.from}
                        checkOut={range.to}
                        onChange={(r) => setRange({ from: r.checkIn, to: r.checkOut })}
                      />
                      <div className={styles.blockForm}>
                        <input
                          className="input"
                          placeholder="Reason (hire, service…)"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                        <Button
                          variant="navy"
                          size="sm"
                          onClick={addBlock}
                          disabled={busy || !range.from || !range.to || range.to <= range.from}
                        >
                          Block dates
                        </Button>
                      </div>
                    </div>

                    <div className={styles.blocks}>
                      <div className={styles.blocksTitle}>Out of service</div>
                      {car.blocks.length === 0 ? (
                        <p className={styles.muted}>Free on every date.</p>
                      ) : (
                        car.blocks.map((b, i) => (
                          <div className={styles.blockRow} key={b.id ?? `${b.from}-${b.to}-${i}`}>
                            <span>{formatDateRange(b.from, b.to, 'en')}</span>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label="Free these dates"
                              disabled={!b.id}
                              onClick={() => void persist(() => freeCarDates(car.id, b.id!))}
                            >
                              <Icon name="x" size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <AdminCarModal
          car={editing}
          onClose={() => setEditing(undefined)}
          onSave={(car) => {
            setEditing(undefined);
            void persist(async () => {
              await saveCar(car);
            });
          }}
        />
      )}
    </div>
  );
}
