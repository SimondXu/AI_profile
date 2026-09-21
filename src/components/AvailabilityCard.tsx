"use client";

import { getConfig } from "@/lib/config-loader";

interface AvailabilityData {
  availability: string;
  preferences: {
    workMode: string;
    location: string;
  };
  skills: {
    technical: string[];
  };
}

interface AvailabilityCardProps {
  data?: AvailabilityData;
}

export default function AvailabilityCard({ data }: AvailabilityCardProps) {
  const config = getConfig();
  const location = data?.preferences.location || config.personal.location.current;
  const skills = data?.skills.technical?.slice(0, 8) || config.skills.languages;

  return (
    <section className="quiet-tool-surface" aria-labelledby="availability-title">
      <h2 id="availability-title">Availability</h2>
      <p>{data?.availability || config.entryLevel.currentStatus}</p>
      <dl>
        <div>
          <dt>Location</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt>Work authorization</dt>
          <dd>{config.personal.workAuthorization?.notes ?? config.personal.workAuthorization?.status}</dd>
        </div>
        <div>
          <dt>Technical foundation</dt>
          <dd>{skills.join(", ")}</dd>
        </div>
      </dl>
      <a href={`mailto:${config.personal.email}`}>Email Simon</a>
    </section>
  );
}
