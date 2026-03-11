'use no memo';

import React from 'react';
import { openDatabaseSync } from 'expo-sqlite';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

type TaskRow = {
  title: string;
  completed: number;
  created_at: number;
};

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getTopTasks(limit = 3): TaskRow[] {
  try {
    const db = openDatabaseSync('gita.db');
    const rows = db.getAllSync<TaskRow>(
      `
      SELECT title, completed, created_at
      FROM tasks
      WHERE day_key = ?
      ORDER BY completed ASC, created_at ASC
      LIMIT ?
      `,
      [startOfDay(Date.now()), limit]
    );
    return rows;
  } catch {
    return [];
  }
}

function TaskItem({ task }: { task: TaskRow }) {
  const done = task.completed === 1;
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: done ? '#162c2a' : '#10253a',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
      }}
    >
      <FlexWidget
        style={{
          height: 14,
          width: 14,
          borderRadius: 99,
          marginRight: 10,
          backgroundColor: done ? '#65a25c' : '#0f172a',
          borderColor: done ? '#65a25c' : '#36506a',
          borderWidth: 2,
        }}
      >
        <TextWidget style={{ fontSize: 0 }} text=" " />
      </FlexWidget>

      <TextWidget
        text={task.title}
        maxLines={1}
        style={{
          color: done ? '#94a3b8' : '#e2e8f0',
          fontSize: 14,
        }}
      />
    </FlexWidget>
  );
}

export function TopTasksWidget() {
  const tasks = getTopTasks(3);
  const completedCount = tasks.filter((t) => t.completed === 1).length;
  const remainingCount = tasks.length - completedCount;
  const hasTasks = tasks.length > 0;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#081623',
        borderRadius: 16,
        padding: 14,
        borderColor: '#1f2d3d',
        borderWidth: 1,
      }}
      accessibilityLabel="Top 3 tasks widget"
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <TextWidget
          text="Today"
          style={{
            fontSize: 18,
            color: '#f8fafc',
          }}
        />
        <TextWidget
          text={
            hasTasks
              ? `${remainingCount} left · ${completedCount} done`
              : 'No tasks yet'
          }
          style={{
            fontSize: 12,
            color: '#8ea6bd',
          }}
        />
      </FlexWidget>

      {hasTasks ? (
        <FlexWidget style={{ width: 'match_parent' }}>
          {tasks.map((task) => (
            <TaskItem key={`${task.created_at}-${task.title}`} task={task} />
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#10253a',
            borderRadius: 12,
            borderColor: '#1d3348',
            borderWidth: 1,
          }}
        >
          <TextWidget
            text="Tap to open Kriya and add your first task"
            maxLines={2}
            style={{
              fontSize: 13,
              color: '#9ca3af',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
