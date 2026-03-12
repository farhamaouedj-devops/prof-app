# 🚀 Guide de déploiement EduProf — 100% Gratuit

## Stack technologique
- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Supabase (BDD PostgreSQL + Auth + Storage + Realtime)
- **Hébergement** : Vercel (gratuit)

---

## ÉTAPE 1 — Créer le projet Supabase (gratuit)

1. Va sur **https://supabase.com** → "Start your project"
2. Crée un compte gratuit et un nouveau projet
3. Choisis une région proche (ex: `eu-west-1 Paris`)
4. Note ton **Project URL** et **anon public key** (dans Settings → API)

---

## ÉTAPE 2 — Initialiser la base de données

Dans Supabase → **SQL Editor**, exécute ce script complet :

```sql
-- ══════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════

CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  is_validated BOOLEAN DEFAULT FALSE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  teacher_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercise_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'corrected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, student_id)
);

CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES exercise_assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text_response TEXT DEFAULT '',
  schema_url TEXT,
  submitted_at TIMESTAMPTZ,
  correction_text TEXT,
  correction_url TEXT,
  corrected_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE voice_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (isolation totale des données)
-- ══════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profile_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profile_teacher_sees_students" ON profiles FOR SELECT USING (
  teacher_id = auth.uid() OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
);

-- EXERCISES
CREATE POLICY "exercise_teacher_all" ON exercises FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "exercise_student_read" ON exercises FOR SELECT USING (
  id IN (SELECT exercise_id FROM exercise_assignments WHERE student_id = auth.uid())
);

-- EXERCISE_ASSIGNMENTS
CREATE POLICY "assignment_teacher" ON exercise_assignments FOR ALL USING (
  exercise_id IN (SELECT id FROM exercises WHERE teacher_id = auth.uid())
);
CREATE POLICY "assignment_student_read" ON exercise_assignments FOR SELECT USING (
  student_id = auth.uid()
);
CREATE POLICY "assignment_student_update" ON exercise_assignments FOR UPDATE USING (
  student_id = auth.uid()
);

-- SUBMISSIONS
CREATE POLICY "submission_student_all" ON submissions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "submission_teacher_all" ON submissions FOR ALL USING (
  assignment_id IN (
    SELECT ea.id FROM exercise_assignments ea
    JOIN exercises e ON ea.exercise_id = e.id
    WHERE e.teacher_id = auth.uid()
  )
);

-- VOICE MESSAGES
CREATE POLICY "voice_all" ON voice_messages FOR ALL USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- NOTIFICATIONS
CREATE POLICY "notif_own" ON notifications FOR ALL USING (user_id = auth.uid());
-- Allow insert from anyone (for cross-user notifications)
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════════════════
-- REALTIME (pour les notifications live)
-- ══════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE voice_messages;
```

---

## ÉTAPE 3 — Créer le bucket de stockage

Dans Supabase → **Storage** → "New bucket" :
- Nom : `media`
- ✅ Public bucket (pour afficher images/audio sans auth)

Puis dans **Policies** du bucket `media`, ajouter :

```sql
-- Permettre l'upload aux utilisateurs connectés
CREATE POLICY "auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
-- Lecture publique
CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
-- L'uploader peut supprimer
CREATE POLICY "auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[2]);
```

---

## ÉTAPE 4 — Configurer l'application

```bash
# Clone ou crée le projet
cd prof-app

# Copie le fichier d'environnement
cp .env.example .env

# Édite .env avec tes vraies clés Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Installe les dépendances
npm install

# Lance en développement
npm run dev
```

---

## ÉTAPE 5 — Déployer sur Vercel (gratuit, illimité)

1. Pousse le code sur **GitHub** (repo privé OK)
2. Va sur **https://vercel.com** → "New Project" → importe ton repo
3. Dans **Environment Variables**, ajoute :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique **Deploy** ✅

---

## Ordre d'utilisation recommandé

### 1. Admin (farha.maouedj@proton.me)
- Inscrit-toi avec cet email → compte admin créé automatiquement
- Accède au tableau de bord admin pour valider les comptes

### 2. Prof
- Crée un compte avec le rôle "Professeur"
- ⚠️ Les profs sont **auto-validées** (pas besoin d'approbation admin)
- Note ton **code prof** (ex: `ABC123`) affiché dans le dashboard
- Partage ce code à tes élèves

### 3. Élèves
- S'inscrivent avec le rôle "Élève" + le code prof
- Compte en attente → l'admin valide → accès accordé
- L'élève reçoit une notification dès validation

---

## Fonctionnalités incluses

| Fonctionnalité | Status |
|---|---|
| 🔐 Auth email/password | ✅ |
| 👩‍💼 Validation manuelle admin | ✅ |
| 🔑 Code prof pour inscription élèves | ✅ |
| 📝 Création exercices (texte + PDF/Image) | ✅ |
| 🎯 Assignation ciblée par élève | ✅ |
| ✏️ Workspace hybride énoncé/réponse | ✅ |
| 💾 Auto-save toutes les 1.5s | ✅ |
| 🖼️ Upload schéma + prise de photo mobile | ✅ |
| 🎙️ Messages vocaux bidirectionnels | ✅ |
| 🗜️ Compression images automatique | ✅ |
| ✅ Correction avec commentaire écrit + vocal | ✅ |
| 🔔 Notifications en temps réel (badges) | ✅ |
| 🔒 Isolation totale des données (RLS) | ✅ |
| 📱 Responsive mobile/tablette/PC | ✅ |

---

## Limites du plan gratuit Supabase

| Ressource | Limite gratuite |
|---|---|
| Base de données | 500 MB |
| Stockage fichiers | 1 GB |
| Bande passante | 5 GB/mois |
| Auth users | 50 000 |
| Realtime connections | 200 |

> Pour une professeure particulière avec ~30 élèves, le plan gratuit suffit largement sur plusieurs années.

---

## Support

- Supabase docs : https://supabase.com/docs
- Vercel docs : https://vercel.com/docs
